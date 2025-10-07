// upload.js (refactored with EXIF, toast, and country support)
import { supabase } from '../../lib/supabaseClient.js';
import * as exifr from 'exifr';
import { showToast } from '../ui/toast.js';

const imageForm = document.getElementById('image-form');
const fileInput = document.getElementById('upload-image');
const locationInput = document.getElementById('image-location');
const descriptionInput = document.getElementById('image-description');
const tagsInput = document.getElementById('image-tags');
const captureDateInput = document.getElementById('image-capture-date');
let captureDate = new Date().toISOString().split('T')[0]; // Default to today
if (captureDateInput && captureDateInput.value) {
  captureDate = captureDateInput.value;
}
const submitBtn = document.getElementById('image-submit-btn');
// Restrict capture date input to today
if (captureDateInput) {
    const today = new Date().toISOString().split('T')[0];
    captureDateInput.max = today;
  }
  
let currentMemoryId = null;

export function openImageUpload(memoryId) {
    currentMemoryId = memoryId;
    imageForm.reset();
    fileInput.value = ''; // <--  this is important!
    document.getElementById('image-upload-modal').classList.remove('hidden');
    submitBtn.textContent = 'Upload';
    submitBtn.disabled = false;
  }
  

export function closeImageUpload() {
  document.getElementById('image-upload-modal').classList.add('hidden');
  imageForm.reset();
  submitBtn.textContent = 'Upload';
  submitBtn.disabled = false;
}
const uploadModal = document.getElementById('image-upload-modal');

if (uploadModal) {
  uploadModal.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeImageUpload();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeImageUpload();
});

fileInput.addEventListener('input', async () => {
    const file = fileInput.files[0];
    const captureDateInput = document.getElementById('image-capture-date');
    if (!file || !captureDateInput) return;
  
    let fallbackUsed = false;
  
    try {
      console.log(' Input triggered, file:', file.name);
      const parsed = await exifr.parse(file, ['DateTimeOriginal']);
  
      if (parsed?.DateTimeOriginal) {
        const isoDate = new Date(parsed.DateTimeOriginal).toISOString().split('T')[0];
        captureDateInput.value = isoDate;
      } else {
        fallbackUsed = true;
      }
    } catch (err) {
      fallbackUsed = true;
    }
  
    if (fallbackUsed || !captureDateInput.value) {
      const today = new Date().toISOString().split('T')[0];
      captureDateInput.value = today;
    }
  });
  
imageForm.addEventListener('submit', async e => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';

  try {
    const file = fileInput.files[0];
    const location = locationInput.value.trim();
    const lat = parseFloat(locationInput.dataset.lat);
    const lon = parseFloat(locationInput.dataset.lon);
    const description = descriptionInput.value.trim();
    const tags = tagsInput.value.trim().split(/[, ]+/).filter(Boolean).join(' ');
    const captureDate = captureDateInput?.value || new Date().toISOString().split('T')[0];

    if (!file) throw new Error('Select an image');

    const safeName = file.name.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
  let user = window.currentUser;
if (!user) {
  const { data } = await supabase.auth.getUser();
  user = data?.user;
}
if (!user) throw new Error('User not authenticated');


    const { data: existingImages } = await supabase
      .from('memory_images')
      .select('image_path')
      .eq('memory_id', currentMemoryId)
      .eq('user_id', user.id);

const alreadyExists = (existingImages || []).some(img => img.image_path.endsWith(safeName));
    if (alreadyExists) throw new Error('Same image already exists in this memory.');

const filePath = `${user.id}/${currentMemoryId}/${Date.now()}_${safeName}`;
    const { error: uploadErr } = await supabase.storage.from('memory-images').upload(filePath, file);
    if (uploadErr) throw new Error('Upload failed');

    const country = !isNaN(lat) && !isNaN(lon) ? await getCountryFromLatLon(lat, lon) : null;

    const insertPayload = {
      user_id: user.id,
      memory_id: currentMemoryId,
      image_path: filePath,
      location,
      description,
      tags,
      lat: isNaN(lat) ? null : lat,
      lon: isNaN(lon) ? null : lon,
      capture_date: captureDate,
      country
    };

    const { error: insertErr } = await supabase.from('memory_images').insert([insertPayload]);
    if (insertErr) throw new Error('Failed to save');

    showToast('Image uploaded!');
    closeImageUpload();
    if (typeof window.loadMemories === 'function') window.loadMemories();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Upload failed', false);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload';
  }
});

async function getCountryFromLatLon(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=3`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SmritiKosha/1.0'
      }
    });
    const data = await response.json();
    return data?.address?.country || null;
  } catch (err) {
    console.error('Reverse geocoding failed:', err);
    return null;
  }
}
