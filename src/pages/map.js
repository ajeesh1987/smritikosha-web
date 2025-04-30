// ✅ map.js
console.log('🧪 map.js loaded');

import { setupFilterOptions, setupFilterEventHandlers, getFilterValues } from './map-filter.js';
import { supabase } from '../../lib/supabaseClient.js';
import { openImageModalFromMap, setupImageModalEvents } from '../ui/imageModal.js';

setupImageModalEvents();

let map;
let currentMarkers = [];

setupFilterOptions();
setupFilterEventHandlers(() => {
  const filters = getFilterValues();
  console.log('📦 Filters:', filters);
  applyFilters(filters);
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    window.location.href = '/login.html';
  }
});

const urlParams = new URLSearchParams(window.location.search);
const defaultLat = parseFloat(urlParams.get('lat')) || 49.57;
const defaultLon = parseFloat(urlParams.get('lon')) || 11.01;

map = new maplibregl.Map({
  container: 'map',
  style: {
    "version": 8,
    "sources": {
      "osm": {
        "type": "raster",
        "tiles": [
          "https://{a,b,c}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        "tileSize": 256
      }
    },
    "layers": [
      {
        "id": "osm",
        "type": "raster",
        "source": "osm",
        "paint": {}
      }
    ]
  },
  
  center: [defaultLon, defaultLat],
  zoom: 3,
  maxZoom: 18,
  minZoom: 2,
  renderWorldCopies: false,
  dragPan: true,
  dragRotate: false,
  scrollZoom: true,
  doubleClickZoom: false,
  touchZoomRotate: true,
  keyboard: true
});

map.addControl(new maplibregl.NavigationControl());
map.addControl(new maplibregl.AttributionControl({
  compact: true,
  customAttribution: [
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
    '© <a href="https://maplibre.org/" target="_blank" rel="noopener">MapLibre</a>',
    'India GeoJSON © <a href="https://data.gov.in/" target="_blank" rel="noopener">Government of India</a>'
  ]
}));

map.on('load', () => {
  map.addSource('india-boundary', {
    type: 'geojson',
    data: '/data/india-land-simplified.geojson'
  });

  map.addLayer({
    id: 'india-boundary-fill',
    type: 'fill',
    source: 'india-boundary',
    layout: {},
    paint: {
      'fill-color': '#D1FAE5',
      'fill-opacity': 0.4
    }
  });

  map.addLayer({
    id: 'india-boundary-outline',
    type: 'line',
    source: 'india-boundary',
    layout: {},
    paint: {
      'line-color': '#065F46',
      'line-width': 1.5
    }
  });

  loadMarkers();
});

map.on('dblclick', (e) => {
  map.easeTo({ center: e.lngLat, zoom: map.getZoom() + 1 });
});

function clearMarkers() {
  for (const marker of currentMarkers) {
    marker.remove();
  }
  currentMarkers = [];
}

async function loadMarkers(filters = {}) {
  clearMarkers();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let query = supabase
    .from('memory_images')
    .select('id, location, lat, lon, description, image_path')
    .eq('user_id', user.id)
    .not('lat', 'is', null)
    .not('lon', 'is', null);

  if (filters.memoryId) query = query.eq('memory_id', filters.memoryId);
  if (filters.country) query = query.eq('country', filters.country);
  if (filters.dateFrom) query = query.gte('capture_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('capture_date', filters.dateTo);

  const { data: images, error } = await query;

  if (error) {
    console.error('❌ Failed to load images:', error);
    return;
  }

  if (!images || images.length === 0) return;

  for (const img of images) {
    const { data: urlData } = await supabase
      .storage
      .from('memory-images')
      .createSignedUrl(img.image_path, 3600);

    const pin = document.createElement('div');
    pin.className = 'pin-marker';
    pin.style.width = '24px';
    pin.style.height = '24px';
    pin.style.backgroundImage = "url('https://cdn-icons-png.flaticon.com/512/2776/2776067.png')";
    pin.style.backgroundSize = 'cover';
    pin.style.cursor = 'pointer';

    const marker = new maplibregl.Marker({ element: pin })
      .setLngLat([img.lon, img.lat])
      .addTo(map);

    pin.addEventListener('click', () => {
      window.openImageModalFromMap?.(img.id);
    });

    currentMarkers.push(marker);
  }
}

async function applyFilters(filters) {
  await loadMarkers(filters);
}

// Close modal logic
function closeImageModal() {
  document.getElementById('image-modal')?.classList.add('hidden');
}

document.getElementById('modal-close')?.addEventListener('click', closeImageModal);

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeImageModal();
});

document.getElementById('image-modal')?.addEventListener('click', e => {
  if (e.target.id === 'image-modal') closeImageModal();
});
