// src/memory/main.js
import { supabase } from '../../lib/supabaseClient.js';

// Redirect if not logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) window.location.href = '/pages/login.html';
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
const addMemoryBtn = document.getElementById('add-memory-btn');

let modalImages = [], modalLocations = [], modalDescriptions = [], modalIds = [];
let currentImageIndex = 0;
let currentMemoryId = null;

// TOAST
function showToast(message, success = true) {
  toast.textContent = message;
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-500 ${
    success ? 'bg-green-600' : 'bg-red-600'
  } text-white opacity-100 pointer-events-auto`;

  // Hide after delay
  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
  }, 2500);

  // Fully remove it from interaction after fade
  setTimeout(() => {
    toast.classList.add('pointer-events-none');
  }, 2000);
}

// MODAL NAVIGATION
function updateImageModalContent() {
  modalImg.src = modalImages[currentImageIndex];
  modalLocation.textContent = modalLocations[currentImageIndex] || '';
  modalDescription.textContent = modalDescriptions[currentImageIndex] || '';
  const showInfo = modalLocations[currentImageIndex] || modalDescriptions[currentImageIndex];
  modalInfoPanel.classList.toggle('hidden', !showInfo);
  modalInfoPanel.style.display = showInfo ? 'block' : 'none';
}
modalPrev.onclick = () => {
  currentImageIndex = (currentImageIndex - 1 + modalImages.length) % modalImages.length;
  updateImageModalContent();
};
modalNext.onclick = () => {
  currentImageIndex = (currentImageIndex + 1) % modalImages.length;
  updateImageModalContent();
};
window.addEventListener('keydown', e => {
  if (!imageModal.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') modalPrev.click();
    if (e.key === 'ArrowRight') modalNext.click();
    if (e.key === 'Escape') closeImageModal();
  }
});
modalImg.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
modalImg.addEventListener('touchend', e => {
  const deltaX = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(deltaX) > 50) deltaX < 0 ? modalNext.click() : modalPrev.click();
});

window.openImageModal = (clickedUrl, indexGuess = 0) => {
  const memoryCard = event.target.closest('[data-memory-id]');
  const allThumbs = memoryCard.querySelectorAll('img');

  modalImages = [];
  modalDescriptions = [];
  modalLocations = [];
  modalIds = [];

  let matchedIndex = 0;

  allThumbs.forEach((img, i) => {
    const wrapper = img.closest('[data-image-id]');
    if (!wrapper) return;

    const id = wrapper.dataset.imageId;
    const url = img.getAttribute('src');
    const desc = img.getAttribute('data-description') || '';
    const loc = img.getAttribute('data-location') || '';

    modalImages.push(url);
    modalDescriptions.push(desc);
    modalLocations.push(loc);
    modalIds.push(id);

    if (url === clickedUrl) matchedIndex = i;
  });

  currentImageIndex = matchedIndex;
  updateImageModalContent();
  imageModal.classList.remove('hidden');
};

window.closeImageModal = () => imageModal.classList.add('hidden');

// PROFILE
profileBtn?.addEventListener('click', () => profileMenu.classList.toggle('hidden'));
logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});
document.addEventListener('click', e => {
  if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
    profileMenu.classList.add('hidden');
  }
});

// AUTOCOMPLETE
let debounceTimeout, activeSuggestionIndex = -1;
locationInput?.addEventListener('input', () => {
  const query = locationInput.value.trim();
  clearTimeout(debounceTimeout);
  if (query.length < 3) return suggestionsBox.classList.add('hidden');
  debounceTimeout = setTimeout(async () => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const results = await res.json();
    suggestionsBox.innerHTML = '';
    results.slice(0, 5).forEach((place, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<div class='flex gap-2 px-3 py-2 hover:bg-indigo-50'><i class='fas fa-map-marker-alt text-indigo-500'></i><span>${place.display_name}</span></div>`;
      li.className = 'cursor-pointer';
      li.dataset.lat = place.lat;
      li.dataset.lon = place.lon;
      li.dataset.index = i;
      li.onclick = () => {
        locationInput.value = place.display_name;
        locationInput.dataset.lat = place.lat;
        locationInput.dataset.lon = place.lon;
        suggestionsBox.classList.add('hidden');
      };
      suggestionsBox.appendChild(li);
    });
    activeSuggestionIndex = -1;
    suggestionsBox.classList.remove('hidden');
  }, 300);
});
locationInput?.addEventListener('keydown', e => {
  const items = suggestionsBox.querySelectorAll('li');
  if (suggestionsBox.classList.contains('hidden') || items.length === 0) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeSuggestionIndex >= 0) items[activeSuggestionIndex].click();
  } else if (e.key === 'Escape') {
    suggestionsBox.classList.add('hidden');
  }
});
function updateActiveSuggestion(items) {
  items.forEach((el, i) => {
    el.classList.toggle('bg-indigo-100', i === activeSuggestionIndex);
    if (i === activeSuggestionIndex) el.scrollIntoView({ block: 'nearest' });
  });
}
document.addEventListener('click', e => {
  if (!locationInput.contains(e.target) && !suggestionsBox.contains(e.target)) suggestionsBox.classList.add('hidden');
});

// Memory modal helpers
window.openMemoryModal = () => {
  memoryModal.classList.remove('hidden');
  memoryModal.classList.add('flex'); // ensure modal uses Flex layout
  document.getElementById('memory-title').focus(); // optional: auto-focus input
};

addMemoryBtn?.addEventListener('click', openMemoryModal);
window.closeMemoryModal = () => {
  memoryModal.classList.add('hidden');
  memoryForm.reset();
  document.getElementById('memory-submit-btn').textContent = 'Create';
  document.getElementById('memory-submit-btn').disabled = false;
};
window.openImageUpload = id => {
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

// Memory CRUD
memoryForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('memory-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  const title = document.getElementById('memory-title').value.trim();
  const location = document.getElementById('memory-location').value.trim();
  const description = document.getElementById('memory-description').value.trim();
  const tags = document.getElementById('memory-tags').value.trim().split(/[, ]+/).filter(Boolean).join(' ');
  const { data: { user } } = await supabase.auth.getUser();

  const { data: existing } = await supabase.from('memories').select('*').eq('user_id', user.id).eq('title', title).maybeSingle();
  if (existing) {
    showToast('Memory with this title exists.', false);
    btn.disabled = false;
    btn.textContent = 'Create';
    return;
  }
  const { error } = await supabase.from('memories').insert([{ user_id: user.id, title, location, description, tags }]);
  if (!error) {
    showToast('Memory created!');
    loadMemories();
  } else {
    showToast('Failed to save memory', false);
  }
  memoryModal.classList.add('hidden');
  memoryForm.reset();
  btn.disabled = false;
  btn.textContent = 'Create';
});
// Custom Confirm Dialog Logic
const confirmDialog = document.getElementById('confirm-dialog');
const confirmMessage = document.getElementById('confirm-message');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmOk = document.getElementById('confirm-ok');

window.showConfirm = function (message) {
  return new Promise(resolve => {
    confirmMessage.textContent = message;
    confirmDialog.classList.remove('hidden');
    confirmDialog.classList.add('flex');

    const close = () => {
      confirmDialog.classList.add('hidden');
      confirmDialog.classList.remove('flex');
    };

    confirmCancel.onclick = () => {
      close();
      resolve(false);
    };
    confirmOk.onclick = () => {
      close();
      resolve(true);
    };
  });
};

imageForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('image-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Uploading...';

  const fileInput = document.getElementById('upload-image');
  const location = locationInput.value.trim();
  const lat = parseFloat(locationInput.dataset.lat);
  const lon = parseFloat(locationInput.dataset.lon);
  const description = document.getElementById('image-description').value.trim();
  const tags = document.getElementById('image-tags').value.trim().split(/[, ]+/).filter(Boolean).join(' ');

  if (!fileInput.files.length) {
    showToast('Select an image', false);
    btn.disabled = false;
    btn.textContent = 'Upload';
    return;
  }

  const file = fileInput.files[0];
  const safeName = file.name.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (!user || userErr) {
    console.error('User fetch failed:', userErr);
    showToast('User not authenticated', false);
    btn.disabled = false;
    btn.textContent = 'Upload';
    return;
  }

  const filePath = `${user.id}/${Date.now()}_${safeName}`;
  const { error: uploadErr } = await supabase.storage.from('memory-images').upload(filePath, file);

  if (uploadErr) {
    console.error('Storage upload error:', uploadErr);
    showToast('Upload failed', false);
    btn.disabled = false;
    btn.textContent = 'Upload';
    return;
  }

  const insertPayload = {
    user_id: user.id,
    memory_id: currentMemoryId,
    image_path: filePath,
    location,
    description,
    tags,
    lat: isNaN(lat) ? null : lat,
    lon: isNaN(lon) ? null : lon
  };

  console.log('Insert payload:', insertPayload);

  const { error: insertErr } = await supabase.from('memory_images').insert([insertPayload]);

  if (insertErr) {
    console.error('Insert error:', insertErr);
    showToast('Save failed', false);
  } else {
    showToast('Image uploaded!');
    loadMemories();
  }

  document.getElementById('image-upload-modal').classList.add('hidden');
  imageForm.reset();
  btn.disabled = false;
  btn.textContent = 'Upload';
});


window.deleteMemory = async id => {
  const confirmed = await showConfirm('Delete memory and its images?');
if (!confirmed) return;

  await supabase.from('memory_images').delete().eq('memory_id', id);
  const { error } = await supabase.from('memories').delete().eq('id', id);
  if (!error) {
    const card = document.querySelector(`[data-memory-id="${id}"]`);
    card?.classList.add('opacity-0');
    setTimeout(() => card?.remove(), 300);
    showToast('Memory deleted');
  }
};

window.deleteImage = async (id, btn) => {
  const confirmed = await window.showConfirm('Delete this image?');
  if (!confirmed) return;

  // Fetch image path before deletion
  const { data: imageData, error: fetchError } = await supabase
    .from('memory_images')
    .select('image_path')
    .eq('id', id)
    .single();

  if (fetchError || !imageData) {
    console.error('Fetch error:', fetchError);
    showToast('Could not find image path', false);
    return;
  }

  // Delete from storage
  const { error: storageError } = await supabase
    .storage
    .from('memory-images')
    .remove([imageData.image_path]);

  if (storageError) {
    console.error('Storage delete error:', storageError);
    showToast('Failed to delete from storage', false);
    return;
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('memory_images')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('Delete error:', dbError);
    showToast('Failed to delete image from database', false);
    return;
  }

  showToast('Image deleted');

  // Remove thumbnail from DOM
  const card = btn.closest('.relative');
  card?.classList.add('opacity-0');
  setTimeout(() => card?.remove(), 300);

  // Remove from modal arrays
  const deletedIndex = modalIds.findIndex(imgId => imgId === id);
  if (deletedIndex !== -1) {
    modalImages.splice(deletedIndex, 1);
    modalDescriptions.splice(deletedIndex, 1);
    modalLocations.splice(deletedIndex, 1);
    modalIds.splice(deletedIndex, 1);

    // Adjust current index
    if (currentImageIndex > deletedIndex) {
      currentImageIndex--;
    }
    if (currentImageIndex >= modalImages.length) {
      currentImageIndex = modalImages.length - 1;
    }

    // Refresh modal or close
    if (modalImages.length > 0 && currentImageIndex >= 0) {
      updateImageModalContent();
    } else {
      closeImageModal();
    }
  }
};


async function loadMemories() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: memories } = await supabase.from('memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  const { data: images } = await supabase.from('memory_images').select('*');
  memoryList.innerHTML = '';

  for (const memory of memories) {
    const related = images.filter(i => i.memory_id === memory.id);
    const urls = await Promise.all(
      related.map(img => supabase.storage.from('memory-images').createSignedUrl(img.image_path, 3600).then(({ data }) => data?.signedUrl))
    );
    const valid = urls.filter(Boolean);
    const locations = related.map(i => i.location || '');
    const descriptions = related.map(i => i.description || '');
    const ids = related.map(i => i.id);
    const card = document.createElement('div');
    card.setAttribute('data-memory-id', memory.id);
    card.className = 'bg-white p-4 border border-gray-200 rounded-lg shadow-sm';
    card.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h3 class='text-lg font-bold text-indigo-700'>${memory.title}</h3>
        <div class="flex gap-2">
          <button onclick="openImageUpload('${memory.id}')"><i class="fas fa-plus text-indigo-600 hover:text-indigo-800"></i></button>
          <button onclick="deleteMemory('${memory.id}')"><i class="fas fa-trash text-red-500 hover:text-red-700"></i></button>
        </div>
      </div>
      ${memory.location ? `<p class='text-sm text-gray-600 mb-1'>📍 ${memory.location}</p>` : ''}
      ${memory.tags ? `<div class="mb-2">${memory.tags.split(/[, ]+/).map(tag => `<span class='inline-block bg-indigo-100 text-indigo-700 text-xs font-medium mr-1 px-2 py-1 rounded-full'>${tag}</span>`).join('')}</div>` : ''}
      <div class="flex flex-wrap gap-2">
        ${valid.map((url, i) => `
          <div class="relative w-28 h-28">
<img 
  src="${url}" 
  data-description="${descriptions[i] || ''}" 
  data-location="${locations[i] || ''}" 
  data-image-id="${ids[i]}" 
  class="w-full h-full object-cover rounded-lg cursor-pointer border hover:ring-2 hover:ring-indigo-300"
  onclick="openImageModal('${url}', ${i})"
/>
            <button onclick="deleteImage('${ids[i]}', this)" class="absolute top-0 right-0 mt-1 mr-1 bg-white rounded-full p-1 shadow-md">
              <i class="fas fa-trash text-red-500 hover:text-red-700"></i>
            </button>
          </div>`).join('')}
      </div>`;
    memoryList.appendChild(card);
  }
  document.getElementById('map-feature-card')?.classList.remove('hidden');

}
// Close memory modal on Escape key or outside click
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !memoryModal.classList.contains('hidden')) {
    closeMemoryModal();
  }
});
// Close image modal if clicked outside the image
document.getElementById('image-modal').addEventListener('click', e => {
  // Only close if the backdrop itself is clicked (not the image or info panel)
  if (e.target === e.currentTarget) {
    closeImageModal();
  }
});

memoryModal.addEventListener('click', e => {
  if (e.target === memoryModal) closeMemoryModal();
});

loadMemories();
