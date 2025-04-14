// src/memory/map.js
import { supabase } from '../../lib/supabaseClient.js';

const urlParams = new URLSearchParams(window.location.search);
const lat = parseFloat(urlParams.get('lat')) || 49.57;
const lon = parseFloat(urlParams.get('lon')) || 11.01;

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [lon, lat],
  zoom: 12
});

map.addControl(new maplibregl.NavigationControl());

// You can later fetch user memories and plot them here
