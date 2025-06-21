document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const cityInput = document.getElementById("cityInput");
  const weatherCard = document.getElementById("weatherCard");
  const favoriteCity = document.getElementById("favoriteCity");
  const loader = document.getElementById("loader");
  const themeToggle = document.getElementById("themeToggle");
  const historyContainer = document.querySelector(".history-items");
  
  let currentUnit = "C";
  
  // Theme handling
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.innerHTML = theme === "dark" ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    themeToggle.innerHTML = newTheme === "dark" ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  });

  // Load favorite city
  loadFavoriteCity();
  
  // Load search history
  loadSearchHistory();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;

    showLoader();
    await fetchWeather(city);
    hideLoader();
  });

  async function fetchWeather(city) {
    try {
      const res = await fetch(`/weather/${city}`);
      const data = await res.json();

      if (data.error) {
        showError(data.message || data.error);
      } else {
        displayWeather(data);
        await loadSearchHistory(); // Refresh history after successful search
      }
    } catch (error) {
      showError("Failed to fetch weather data");
    }
  }

  function displayWeather(data) {
    const { current, forecast } = data;
    
    // Update current weather
    weatherCard.innerHTML = `
      <div class="current-weather">
        <div class="weather-header">
          <h2 class="city-name">${current.city}, ${current.country}</h2>
          <button id="saveBtn" class="favorite-btn">
            <i class="far fa-star"></i>
          </button>
        </div>
        
        <div class="weather-info">
          <div class="temperature">
            <span class="temp-value">${formatTemperature(current.temp_c, current.temp_f)}</span>
            <button id="unitToggle" class="unit-toggle">°${currentUnit}</button>
          </div>
          <div class="condition">
            <img class="weather-icon" src="${current.icon}" alt="${current.condition}" />
            <span class="condition-text">${current.condition}</span>
          </div>
        </div>

        <div class="weather-details">
          <div class="detail">
            <i class="fas fa-temperature-low"></i>
            <span>Feels like: <span class="feels-like">${formatTemperature(current.feelslike_c, current.feelslike_f)}</span></span>
          </div>
          <div class="detail">
            <i class="fas fa-tint"></i>
            <span>Humidity: ${current.humidity}%</span>
          </div>
          <div class="detail">
            <i class="fas fa-wind"></i>
            <span>Wind: ${current.wind_kph} km/h ${current.wind_dir}</span>
          </div>
          <div class="detail">
            <i class="fas fa-sun"></i>
            <span>UV Index: ${current.uv}</span>
          </div>
        </div>
      </div>

      <div class="forecast">
        <h3>5-Day Forecast</h3>
        <div class="forecast-container">
          ${forecast.map(day => createForecastItem(day)).join('')}
        </div>
      </div>
    `;

    weatherCard.classList.remove("hidden");

    // Setup event listeners for the new elements
    setupEventListeners(current.city);
  }

  function createForecastItem(day) {
    return `
      <div class="forecast-item">
        <div class="date">${formatDate(day.date)}</div>
        <img src="${day.icon}" alt="${day.condition}" />
        <div class="forecast-temp">
          <span class="max">${formatTemperature(day.temp_c_max, day.temp_f_max)}</span>
          <span class="min">${formatTemperature(day.temp_c_min, day.temp_f_min)}</span>
        </div>
        <div class="forecast-details">
          <div><i class="fas fa-tint"></i> ${day.chance_of_rain}%</div>
          <div><i class="fas fa-humidity"></i> ${day.humidity}%</div>
        </div>
      </div>
    `;
  }

  function setupEventListeners(city) {
    const saveBtn = document.getElementById("saveBtn");
    const unitToggle = document.getElementById("unitToggle");

    saveBtn.addEventListener("click", async () => {
      await saveFavoriteCity(city);
      saveBtn.innerHTML = '<i class="fas fa-star"></i>';
    });

    unitToggle.addEventListener("click", () => {
      currentUnit = currentUnit === "C" ? "F" : "C";
      updateTemperatureDisplay();
    });
  }

  async function saveFavoriteCity(city) {
    try {
      await fetch("/user/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city })
      });
      await loadFavoriteCity();
    } catch (error) {
      showError("Failed to save favorite city");
    }
  }

  async function loadFavoriteCity() {
    try {
      const res = await fetch("/user/favorite");
      const data = await res.json();
      favoriteCity.textContent = data.favoriteCity || "None saved";
    } catch (error) {
      favoriteCity.textContent = "Error loading favorite city";
    }
  }

  async function loadSearchHistory() {
    try {
      const res = await fetch("/history");
      const data = await res.json();
      
      historyContainer.innerHTML = data.history
        .map(city => `
          <button class="history-item" data-city="${city}">
            ${city}
          </button>
        `).join('');

      // Add click handlers to history items
      document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
          cityInput.value = item.dataset.city;
          form.dispatchEvent(new Event('submit'));
        });
      });
    } catch (error) {
      console.error("Failed to load search history:", error);
    }
  }

  function formatTemperature(celsius, fahrenheit) {
    return currentUnit === "C" ? `${celsius}°C` : `${fahrenheit}°F`;
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function updateTemperatureDisplay() {
    const unitToggle = document.getElementById("unitToggle");
    unitToggle.textContent = `°${currentUnit}`;

    document.querySelectorAll('.temperature, .feels-like, .forecast-temp').forEach(el => {
      const tempText = el.textContent;
      if (tempText.includes('°C') || tempText.includes('°F')) {
        const value = parseFloat(tempText);
        if (currentUnit === "F") {
          el.textContent = `${(value * 9/5 + 32).toFixed(1)}°F`;
        } else {
          el.textContent = `${((value - 32) * 5/9).toFixed(1)}°C`;
        }
      }
    });
  }

  function showLoader() {
    loader.classList.remove("hidden");
    weatherCard.classList.add("hidden");
  }

  function hideLoader() {
    loader.classList.add("hidden");
  }

  function showError(message) {
    weatherCard.innerHTML = `<p class="error" style="color: var(--primary-color); text-align: center;">${message}</p>`;
    weatherCard.classList.remove("hidden");
  }
});
