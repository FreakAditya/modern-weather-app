const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const dataFile = path.join(__dirname, 'data.json');

// Load or create data file
function readData() {
  try {
    if (!fs.existsSync(dataFile)) {
      const initial = { favoriteCity: "", lastSearched: [] };
      fs.writeFileSync(dataFile, JSON.stringify(initial, null, 2));
      return initial;
    }
    const content = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Reset the file if JSON is corrupted or empty
    const fallback = { favoriteCity: "", lastSearched: [] };
    fs.writeFileSync(dataFile, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}


function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// GET /weather/:city
app.get('/weather/:city', async (req, res) => {
  const city = req.params.city;
  const apiKey = process.env.API_KEY;
  
  try {
    // Get current weather
    const currentWeatherUrl = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=yes`;
    const forecastUrl = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=5&aqi=yes`;

    const [currentRes, forecastRes] = await Promise.all([
      axios.get(currentWeatherUrl),
      axios.get(forecastUrl)
    ]);

    const current = currentRes.data;
    const forecast = forecastRes.data;

    // Save search history
    const data = readData();
    if (!data.lastSearched.includes(city)) {
      data.lastSearched.unshift(city);
      data.lastSearched = data.lastSearched.slice(0, 5);
      writeData(data);
    }

    // Format response
    const response = {
      current: {
        city: current.location.name,
        country: current.location.country,
        temp_c: current.current.temp_c,
        temp_f: current.current.temp_f,
        condition: current.current.condition.text,
        icon: current.current.condition.icon,
        feelslike_c: current.current.feelslike_c,
        feelslike_f: current.current.feelslike_f,
        humidity: current.current.humidity,
        wind_kph: current.current.wind_kph,
        wind_dir: current.current.wind_dir,
        uv: current.current.uv,
        air_quality: current.current.air_quality
      },
      forecast: forecast.forecast.forecastday.map(day => ({
        date: day.date,
        temp_c_max: day.day.maxtemp_c,
        temp_c_min: day.day.mintemp_c,
        temp_f_max: day.day.maxtemp_f,
        temp_f_min: day.day.mintemp_f,
        condition: day.day.condition.text,
        icon: day.day.condition.icon,
        chance_of_rain: day.day.daily_chance_of_rain,
        humidity: day.day.avghumidity
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Weather API Error:', error.message);
    res.status(404).json({ 
      error: 'City not found or API error',
      message: error.response?.data?.error?.message || error.message 
    });
  }
});

// GET /history
app.get('/history', (req, res) => {
  const data = readData();
  res.json({ history: data.lastSearched });
});

// POST /user/favorite
app.post('/user/favorite', (req, res) => {
  const { city } = req.body;
  const data = readData();
  data.favoriteCity = city;
  writeData(data);
  res.json({ message: `Saved favorite city as ${city}` });
});

// GET /user/favorite
app.get('/user/favorite', (req, res) => {
  const data = readData();
  res.json({ favoriteCity: data.favoriteCity });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
