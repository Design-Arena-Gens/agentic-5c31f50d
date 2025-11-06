(function () {
  const inputElement = document.getElementById('cityInput');
  const actionButton = document.getElementById('getWeatherBtn');
  const statusElement = document.getElementById('status');
  const resultsSection = document.getElementById('results');

  const locationNameElement = document.getElementById('locationName');
  const temperatureElement = document.getElementById('temperature');
  const humidityElement = document.getElementById('humidity');
  const rainChanceElement = document.getElementById('rainChance');
  const adviceElement = document.getElementById('adviceHi');
  const updatedAtElement = document.getElementById('updatedAt');

  function setLoading(isLoading) {
    actionButton.disabled = isLoading;
    statusElement.textContent = isLoading ? 'Fetching weather?' : '';
  }

  function showResults() {
    resultsSection.classList.remove('hidden');
  }

  function formatLocation(geo) {
    const parts = [geo.name];
    if (geo.admin1 && geo.admin1 !== geo.name) parts.push(geo.admin1);
    if (geo.country) parts.push(geo.country);
    return parts.filter(Boolean).join(', ');
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  async function geocodeCity(cityName) {
    const encoded = encodeURIComponent(cityName.trim());
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=1&language=hi&format=json`;
    const data = await fetchJson(url);
    if (!data || !data.results || data.results.length === 0) {
      throw new Error('City not found');
    }
    const match = data.results[0];
    return {
      name: match.name,
      admin1: match.admin1 || '',
      country: match.country || '',
      latitude: match.latitude,
      longitude: match.longitude,
      timezone: match.timezone || 'auto'
    };
  }

  async function getWeather(latitude, longitude) {
    const currentParams = [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation'
    ].join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${currentParams}&daily=precipitation_probability_max&forecast_days=1&timezone=auto`;
    const data = await fetchJson(url);

    const current = data.current || {};
    const daily = data.daily || {};

    const temperatureC = Number(current.temperature_2m ?? NaN);
    const humidityPct = Number(current.relative_humidity_2m ?? NaN);

    let rainChancePct = null;
    if (Array.isArray(daily.precipitation_probability_max) && daily.precipitation_probability_max.length > 0) {
      rainChancePct = Number(daily.precipitation_probability_max[0]);
    }

    const timeISO = current.time || new Date().toISOString();

    return {
      temperatureC,
      humidityPct,
      rainChancePct,
      timeISO
    };
  }

  function buildHindiAdvice(temperatureC, humidityPct, rainChancePct) {
    const guidance = [];

    if (Number.isFinite(temperatureC)) {
      if (temperatureC >= 35) {
        guidance.push('???? ????? ??, ???? ??? ???? ?? ??? ?? ?????');
      } else if (temperatureC >= 28) {
        guidance.push('??? ???? ??, ????? ???? ????? ??????');
      } else if (temperatureC >= 20) {
        guidance.push('???? ??????? ??, ???? ????? ?? ??? ????? ????');
      } else if (temperatureC >= 10) {
        guidance.push('????? ???? ??, ????? ????? ??? ?????');
      } else {
        guidance.push('?????? ?? ????? ??, ??? ????? ?? ???? ??????');
      }
    }

    if (Number.isFinite(rainChancePct)) {
      if (rainChancePct >= 70) guidance.push('?? ????? ?? ????? ??????? ??, ???? ?? ?????? ??? ?????');
      else if (rainChancePct >= 40) guidance.push('????? ?? ???? ??, ???? ???? ????? ?????');
    }

    if (Number.isFinite(humidityPct)) {
      if (humidityPct >= 80 && temperatureC >= 28) {
        guidance.push('??? ???? ??, ???? ??? ?? ????? ???? ????');
      }
    }

    return guidance.join(' ');
  }

  function updateUI(geo, weather) {
    locationNameElement.textContent = formatLocation(geo);

    if (Number.isFinite(weather.temperatureC)) {
      temperatureElement.textContent = weather.temperatureC.toFixed(1);
    } else {
      temperatureElement.textContent = '?';
    }

    if (Number.isFinite(weather.humidityPct)) {
      humidityElement.textContent = Math.round(weather.humidityPct).toString();
    } else {
      humidityElement.textContent = '?';
    }

    if (Number.isFinite(weather.rainChancePct)) {
      rainChanceElement.textContent = Math.round(weather.rainChancePct).toString();
    } else {
      rainChanceElement.textContent = '?';
    }

    const adviceHi = buildHindiAdvice(weather.temperatureC, weather.humidityPct, weather.rainChancePct);
    adviceElement.textContent = adviceHi;

    const updated = new Date(weather.timeISO);
    updatedAtElement.textContent = `Updated: ${isNaN(updated.getTime()) ? 'now' : updated.toLocaleString()}`;

    showResults();
  }

  async function handleGetWeather() {
    const cityNameRaw = inputElement.value || '';
    const cityName = cityNameRaw.trim();

    if (!cityName) {
      statusElement.textContent = 'Please enter a city name.';
      inputElement.focus();
      return;
    }

    setLoading(true);
    try {
      const geo = await geocodeCity(cityName);
      const weather = await getWeather(geo.latitude, geo.longitude);
      updateUI(geo, weather);
      statusElement.textContent = '';
    } catch (error) {
      console.error(error);
      statusElement.textContent = 'City not found or service unavailable. Try another name.';
    } finally {
      setLoading(false);
    }
  }

  // Wire up events
  actionButton.addEventListener('click', handleGetWeather);
  inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGetWeather();
    }
  });

  // Autofocus for convenience on mobile too
  setTimeout(() => inputElement.focus(), 50);
})();
