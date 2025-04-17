import { supabase } from '../../lib/supabaseClient.js';

supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    window.location.href = '/login.html';
  }
});

const urlParams = new URLSearchParams(window.location.search);
const defaultLat = parseFloat(urlParams.get('lat')) || 49.57;
const defaultLon = parseFloat(urlParams.get('lon')) || 11.01;

const map = new maplibregl.Map({
  container: 'map',
  style: '/styles/clean-light-style.json',
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

async function loadMarkers() {
  const { data: images, error } = await supabase
    .from('memory_images')
    .select('id, location, lat, lon, description, image_path')
    .not('lat', 'is', null)
    .not('lon', 'is', null);

  if (error) {
    console.error('Failed to load images with location:', error);
    return;
  }

  for (const img of images) {
    const { data: urlData } = await supabase
      .storage
      .from('memory-images')
      .createSignedUrl(img.image_path, 3600);

    const popupContent = `
      <div class="text-sm max-w-xs">
        ${img.location ? `<p class="font-semibold mb-1">${img.location}</p>` : ''}
        ${img.description ? `<p class="mb-2 text-gray-700">${img.description}</p>` : ''}
        ${urlData?.signedUrl ? `<img src="${urlData.signedUrl}" class="rounded shadow max-h-32" />` : ''}
      </div>
    `;

    const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupContent);

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
      popup.setLngLat([img.lon, img.lat]).addTo(map);
    });
  }
}
