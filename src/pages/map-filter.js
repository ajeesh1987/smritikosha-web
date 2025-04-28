// ✅ map-filter.js
import { supabase } from '../../lib/supabaseClient.js';

export async function setupFilterOptions() {
  const memorySelect = document.getElementById('filter-memory');
  const countrySelect = document.getElementById('filter-country');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Memory Titles with at least one image
  const { data: memoryData, error: memoryErr } = await supabase
    .from('memories')
    .select('id, title')
    .eq('user_id', user.id);

  const { data: imageData, error: imageErr } = await supabase
    .from('memory_images')
    .select('memory_id')
    .eq('user_id', user.id);

  if (memoryErr || imageErr) {
    console.error('Failed to load memory titles or image data:', memoryErr || imageErr);
    return;
  }

  const imageMemoryIds = new Set(imageData.map(img => img.memory_id));
  const filteredMemories = memoryData.filter(mem => imageMemoryIds.has(mem.id));

  for (const memory of filteredMemories) {
    const option = document.createElement('option');
    option.value = memory.id;
    option.textContent = memory.title;
    memorySelect.appendChild(option);
  }

  // Distinct countries from memory_images
  const { data: countriesData, error: countryErr } = await supabase
    .from('memory_images')
    .select('country')
    .eq('user_id', user.id);

  if (countryErr) {
    console.error('Failed to fetch countries:', countryErr);
    return;
  }

  const uniqueCountries = [...new Set((countriesData || []).map(item => item.country).filter(Boolean))];

  for (const country of uniqueCountries) {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  }

  // ⛔ Prevent future dates on both fields
  const today = new Date().toISOString().split('T')[0];
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');

  dateFrom.max = today;
  dateTo.max = today;

  // 🔄 Ensure dateTo is >= dateFrom
  dateFrom.addEventListener('change', () => {
    const fromVal = dateFrom.value;
    dateTo.min = fromVal;
    if (dateTo.value && dateTo.value < fromVal) {
      dateTo.value = fromVal;
    }
  });

  dateTo.addEventListener('change', () => {
    const toVal = dateTo.value;
    if (dateFrom.value && toVal < dateFrom.value) {
      dateTo.value = dateFrom.value;
    }
  });
}

export function getFilterValues() {
  return {
    memoryId: document.getElementById('filter-memory')?.value,
    country: document.getElementById('filter-country')?.value,
    dateFrom: document.getElementById('date-from')?.value,
    dateTo: document.getElementById('date-to')?.value
  };
}

export function resetFilters() {
  document.getElementById('filter-memory').value = '';
  document.getElementById('filter-country').value = '';
  document.getElementById('date-from').value = '';
  document.getElementById('date-to').value = '';
} 

export function setupFilterEventHandlers(onApply) {
  document.getElementById('apply-filters').addEventListener('click', onApply);
  document.getElementById('reset-filters').addEventListener('click', () => {
    resetFilters();
    onApply();
  });
}