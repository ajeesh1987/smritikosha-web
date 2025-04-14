// src/memory/main.js
import { supabase } from '../../lib/supabaseClient.js';

// Redirect to login if user is not logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    window.location.href = '/pages/login.html';
  }
});

const memoryList = document.getElementById('memory-list');
const memoryModal = document.getElementById('memory-modal');
const imageModal = document.getElementById('image-modal');
const memoryForm = document.getElementById('memory-form');
const imageForm = document.getElementById('image-form');
const toast = document.getElementById('toast');
const modalImg = document.getElementById('modal-image');
const modalLocation = document.getElementById('modal-location');
const modalDescription = document.getElementById('modal-description');
const modalInfoPanel = document.getElementById('modal-info-panel');
const modalPrev = document.getElementById('modal-prev');
const modalNext = document.getElementById('modal-next');
const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');
const logoutBtn = document.getElementById('logout-btn');
const locationInput = document.getElementById('image-location');
const suggestionsBox = document.getElementById('location-suggestions');

let debounceTimeout;
locationInput?.addEventListener('input', () => {
  const query = locationInput.value.trim();
  clearTimeout(debounceTimeout);
  if (query.length < 3) {
    suggestionsBox.classList.add('hidden');
    return;
  }
  debounceTimeout = setTimeout(async () => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const results = await res.json();
    suggestionsBox.innerHTML = '';
    results.slice(0, 5).forEach(place => {
      const li = document.createElement('li');
      li.textContent = place.display_name;
      li.className = 'cursor-pointer px-3 py-2 hover:bg-indigo-100';
      li.addEventListener('click', () => {
        locationInput.value = place.display_name;
        locationInput.dataset.lat = place.lat;
        locationInput.dataset.lon = place.lon;
        suggestionsBox.classList.add('hidden');
      });
      suggestionsBox.appendChild(li);
    });
    suggestionsBox.classList.remove('hidden');
  }, 300);
});

document.addEventListener('click', (e) => {
  if (!locationInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
    suggestionsBox.classList.add('hidden');
  }
});

let modalImages = [], modalLocations = [], modalDescriptions = [], modalIds = [];
let currentImageIndex = 0;
let currentMemoryId = null;

function showToast(message, success = true) {
  toast.textContent = message;
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg opacity-0 pointer-events-none transition duration-300 z-50 ${success ? 'bg-green-600' : 'bg-red-600'} text-white`;
  toast.classList.add('opacity-100');
  setTimeout(() => toast.classList.remove('opacity-100'), 2500);
}

function updateImageModalContent() {
  modalImg.src = modalImages[currentImageIndex];
  modalLocation.textContent = modalLocations[currentImageIndex] || '';
  modalDescription.textContent = modalDescriptions[currentImageIndex] || '';
  const shouldShow = modalLocations[currentImageIndex] || modalDescriptions[currentImageIndex];
  modalInfoPanel.classList.toggle('hidden', !shouldShow);
  modalInfoPanel.style.display = shouldShow ? 'block' : 'none';
}

modalPrev?.addEventListener('click', () => {
  currentImageIndex = (currentImageIndex - 1 + modalImages.length) % modalImages.length;
  updateImageModalContent();
});
modalNext?.addEventListener('click', () => {
  currentImageIndex = (currentImageIndex + 1) % modalImages.length;
  updateImageModalContent();
});

window.addEventListener('keydown', (e) => {
  if (!imageModal.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') modalPrev.click();
    if (e.key === 'ArrowRight') modalNext.click();
    if (e.key === 'Escape') closeImageModal();
  }
});

let touchStartX = 0, touchEndX = 0;
modalImg?.addEventListener('touchstart', (e) => touchStartX = e.changedTouches[0].screenX);
modalImg?.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  if (Math.abs(touchEndX - touchStartX) > 50) {
    (touchEndX < touchStartX ? modalNext : modalPrev).click();
  }
});

window.openImageModal = (urls, index, locations = [], descriptions = [], ids = []) => {
  modalImages = urls;
  modalLocations = locations;
  modalDescriptions = descriptions;
  modalIds = ids;
  currentImageIndex = index;
  updateImageModalContent();
  imageModal.classList.remove('hidden');
};
window.closeImageModal = () => imageModal.classList.add('hidden');

profileBtn?.addEventListener('click', () => profileMenu.classList.toggle('hidden'));
logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});

memoryForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('memory-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const title = document.getElementById('memory-title').value.trim();
  const location = document.getElementById('memory-location').value.trim();
  const description = document.getElementById('memory-description').value.trim();
  const tags = document.getElementById('memory-tags').value.trim().split(/[, ]+/).filter(Boolean).slice(0, 5).join(' ');
  const { data: { user } } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .eq('title', title)
    .maybeSingle();

  if (existing) {
    showToast('Memory with this title exists.', false);
    btn.disabled = false;
    btn.textContent = 'Create';
    return;
  }

  const { error } = await supabase.from('memories').insert([{ user_id: user.id, title, location, description, tags }]);
  if (error) {
    console.error(error);
    showToast('Failed to save memory', false);
  } else {
    showToast('Memory created!');
    loadMemories();
  }

  memoryForm.reset();
  memoryModal.classList.add('hidden');
  btn.disabled = false;
  btn.textContent = 'Create';
});

imageForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('image-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Uploading...';

  const fileInput = document.getElementById('upload-image');
  const location = locationInput.value.trim();
  const description = document.getElementById('image-description').value.trim();
  const tags = document.getElementById('image-tags').value.trim().split(/[, ]+/).filter(Boolean).slice(0, 5).join(' ');
  if (!fileInput.files.length) {
    showToast('Select an image', false);
    btn.disabled = false;
    btn.textContent = 'Upload';
    return;
  }

  const file = fileInput.files[0];
  const safeName = file.name.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
  const { data: { user } } = await supabase.auth.getUser();
  const filePath = `${user.id}/${Date.now()}_${safeName}`;

  const { error: uploadErr } = await supabase.storage.from('memory-images').upload(filePath, file);
  if (uploadErr) {
    console.error(uploadErr);
    showToast('Upload failed', false);
    return;
  }

  const { error: insertErr } = await supabase.from('memory_images').insert([{ memory_id: currentMemoryId, image_path: filePath, location, description, tags }]);
  if (insertErr) {
    console.error(insertErr);
    showToast('Failed to save image', false);
  } else {
    showToast('Image uploaded!');
    loadMemories();
  }

  imageForm.reset();
  document.getElementById('image-upload-modal').classList.add('hidden');
  btn.disabled = false;
  btn.textContent = 'Upload';
});

window.deleteImage = async (imageId, btnEl) => {
  const confirmBox = document.createElement('div');
  confirmBox.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
  confirmBox.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg text-center">
      <p class="mb-4 text-gray-700">Delete this image?</p>
      <div class="flex justify-center gap-4">
        <button class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" id="cancel-delete">Cancel</button>
        <button class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" id="confirm-delete">Delete</button>
      </div>
    </div>`;
  document.body.appendChild(confirmBox);
  document.getElementById('cancel-delete').onclick = () => confirmBox.remove();
  document.getElementById('confirm-delete').onclick = async () => {
    confirmBox.remove();
    const { error } = await supabase.from('memory_images').delete().eq('id', imageId);
    if (!error) {
      const card = btnEl.closest('.relative');
      card?.classList.add('opacity-0');
      setTimeout(() => card?.remove(), 300);
      showToast('Image deleted');
    } else {
      showToast('Failed to delete image', false);
    }
  };
};

window.deleteMemory = async (memoryId) => {
  const confirmBox = document.createElement('div');
  confirmBox.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
  confirmBox.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg text-center">
      <p class="mb-4 text-gray-700 text-lg">Delete this memory and all images?</p>
      <div class="flex justify-center gap-4 mt-4">
        <button class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" id="cancel-mem-delete">Cancel</button>
        <button class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" id="confirm-mem-delete">Delete</button>
      </div>
    </div>`;
  document.body.appendChild(confirmBox);
  document.getElementById('cancel-mem-delete').onclick = () => confirmBox.remove();
  document.getElementById('confirm-mem-delete').onclick = async () => {
    confirmBox.remove();
    await supabase.from('memory_images').delete().eq('memory_id', memoryId);
    const { error } = await supabase.from('memories').delete().eq('id', memoryId);
    if (!error) {
      const card = document.querySelector(`[data-memory-id="${memoryId}"]`);
      card?.classList.add('opacity-0');
      setTimeout(() => card?.remove(), 300);
      showToast('Memory deleted');
    } else {
      showToast('Failed to delete memory', false);
    }
  };
};

async function loadMemories() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: memories } = await supabase.from('memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  const { data: images } = await supabase.from('memory_images').select('*');

  memoryList.innerHTML = '';
  for (const memory of memories) {
    const related = images.filter(img => img.memory_id === memory.id);
    const urls = await Promise.all(related.map(img => supabase.storage.from('memory-images').createSignedUrl(img.image_path, 3600).then(({ data }) => data?.signedUrl)));
    const valid = urls.filter(Boolean);
    const locations = related.map(i => i.location || '');
    const descriptions = related.map(i => i.description || '');
    const ids = related.map(i => i.id);

    const card = document.createElement('div');
    card.setAttribute('data-memory-id', memory.id);
    card.className = 'bg-white p-4 border border-gray-200 rounded-lg shadow-sm text-left';
    card.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h3 class='text-lg font-bold text-indigo-700'>${memory.title}</h3>
        <div class="flex gap-2">
          <button onclick="openImageUpload('${memory.id}')"><i class="fas fa-plus text-indigo-600 hover:text-indigo-800"></i></button>
          <button onclick="deleteMemory('${memory.id}')"><i class="fas fa-trash text-red-500 hover:text-red-700"></i></button>
        </div>
      </div>
      ${memory.location ? `<p class='text-sm text-gray-600 mb-1'>📍 ${memory.location}</p>` : ''}
      ${memory.tags ? `<div class="mb-2">${memory.tags.split(/[, ]+/).map(tag => `<span class="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium mr-1 px-2 py-1 rounded-full">${tag}</span>`).join('')}</div>` : ''}
      <div class="flex flex-wrap gap-2">
        ${valid.map((url, i) => `
          <div class="relative w-28 h-28">
            <img src="${url}" class="w-full h-full object-cover rounded-lg cursor-pointer border hover:ring-2 hover:ring-indigo-300" onclick='openImageModal(${JSON.stringify(valid)}, ${i}, ${JSON.stringify(locations)}, ${JSON.stringify(descriptions)}, ${JSON.stringify(ids)})' />
            <button onclick="deleteImage('${ids[i]}', this)" class="absolute top-0 right-0 mt-1 mr-1 bg-white rounded-full p-1 shadow-md"><i class="fas fa-trash text-red-500 hover:text-red-700"></i></button>
          </div>`).join('')}
      </div>`;
    memoryList.appendChild(card);
  }
}

window.openMemoryModal = () => memoryModal.classList.remove('hidden');
window.closeMemoryModal = () => {
  memoryModal.classList.add('hidden');
  memoryForm.reset();
  document.getElementById('memory-submit-btn').textContent = 'Create';
  document.getElementById('memory-submit-btn').disabled = false;
};

window.openImageUpload = (id) => {
  currentMemoryId = id;
  imageForm.reset();
  document.getElementById('image-upload-modal').classList.remove('hidden');
};
window.closeImageUpload = () => {
  document.getElementById('image-upload-modal').classList.add('hidden');
  imageForm.reset();
  document.getElementById('image-submit-btn').textContent = 'Upload';
  document.getElementById('image-submit-btn').disabled = false;
};

loadMemories();
