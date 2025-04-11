// src/memory/main.js
import { supabase } from '../../lib/supabaseClient.js';

const memoryList = document.getElementById('memory-list');
const memoryModal = document.getElementById('memory-modal');
const imageModal = document.getElementById('image-modal');
const memoryForm = document.getElementById('memory-form');
const imageForm = document.getElementById('image-form');
const toast = document.getElementById('toast');
const modalImg = document.getElementById('modal-image');
const modalPrev = document.getElementById('modal-prev');
const modalNext = document.getElementById('modal-next');
const modalDesc = document.getElementById('modal-description');
const modalLocation = document.getElementById('modal-location');
const infoPanel = document.querySelector('#image-modal .image-info-panel');

let modalImages = [];
let modalDescriptions = [];
let modalLocations = [];
let currentImageIndex = 0;
let currentMemoryId = null;

function showToast(message, success = true) {
  toast.textContent = message;
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg opacity-0 pointer-events-none transition duration-300 z-50 ${success ? 'bg-green-600' : 'bg-red-600'} text-white`;
  toast.classList.add('opacity-100');
  setTimeout(() => toast.classList.remove('opacity-100'), 2500);
}

function updateModalContent() {
  const description = modalDescriptions[currentImageIndex]?.trim();
  const location = modalLocations[currentImageIndex]?.trim();

  modalImg.src = modalImages[currentImageIndex];
  modalDesc.textContent = description || '';
  modalLocation.textContent = location ? `📍 ${location}` : '';

  if (infoPanel) {
    const shouldShow = !!description || !!location;
    if (shouldShow) {
      infoPanel.classList.remove('hidden');
      infoPanel.style.display = 'block';
    } else {
      infoPanel.classList.add('hidden');
      infoPanel.style.display = 'none';
    }
  }
}

window.openImageModal = (images, index) => {
  modalImages = images.map(img => img.url);
  modalDescriptions = images.map(img => img.description || '');
  modalLocations = images.map(img => img.location || '');
  currentImageIndex = index;
  updateModalContent();
  imageModal.classList.remove('hidden');
};

window.closeImageModal = () => imageModal.classList.add('hidden');
window.openMemoryModal = () => memoryModal.classList.remove('hidden');
window.closeMemoryModal = () => {
  memoryModal.classList.add('hidden');
  memoryForm.reset();
  document.getElementById('memory-submit-btn').textContent = 'Create';
  document.getElementById('memory-submit-btn').disabled = false;
};

window.openImageUpload = (memoryId) => {
  currentMemoryId = memoryId;
  imageForm.reset();
  document.getElementById('image-upload-modal').classList.remove('hidden');
};

window.closeImageUpload = () => {
  document.getElementById('image-upload-modal').classList.add('hidden');
  imageForm.reset();
  document.getElementById('image-submit-btn').textContent = 'Upload';
  document.getElementById('image-submit-btn').disabled = false;
};

modalPrev?.addEventListener('click', () => {
  if (currentImageIndex > 0) {
    currentImageIndex--;
    updateModalContent();
  }
});

modalNext?.addEventListener('click', () => {
  if (currentImageIndex < modalImages.length - 1) {
    currentImageIndex++;
    updateModalContent();
  }
});

imageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('image-submit-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Uploading...';

  const imageInput = document.getElementById('upload-image');
  const description = document.getElementById('image-description').value.trim();
  const tagsRaw = document.getElementById('image-tags').value.trim();
  const location = document.getElementById('image-location').value.trim();

  if (!imageInput.files.length) {
    showToast('Please select an image.', false);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Upload';
    return;
  }

  const tagArray = tagsRaw.split(/[, ]+/).filter(Boolean).slice(0, 5);
  const tagString = tagArray.join(' ');

  const { data: { user } } = await supabase.auth.getUser();
  const file = imageInput.files[0];
  const safeName = file.name.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
  const filePath = `${user.id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('memory-images')
    .upload(filePath, file);

  if (uploadError) {
    console.error(uploadError);
    showToast('Upload failed', false);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Upload';
    return;
  }

  const { error: insertErr } = await supabase.from('memory_images').insert([{
    memory_id: currentMemoryId,
    image_path: filePath,
    location,
    description,
    tags: tagString
  }]);

  if (insertErr) {
    console.error(insertErr);
    showToast('Could not save image.', false);
  } else {
    showToast('Image added!');
    window.closeImageUpload();
    await loadMemories();
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Upload';
});

async function loadMemories() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: memories } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const { data: allImages } = await supabase
    .from('memory_images')
    .select('memory_id, image_path, description, location');

  memoryList.innerHTML = '';

  for (const memory of memories) {
    const relatedImages = allImages.filter(img => img.memory_id === memory.id);
    const imageData = await Promise.all(
      relatedImages.map(async (img) => {
        const { data: signed } = await supabase.storage
          .from('memory-images')
          .createSignedUrl(img.image_path, 3600);
        return {
          url: signed?.signedUrl,
          description: img.description || '',
          location: img.location || ''
        };
      })
    );
    const validImages = imageData.filter(img => img.url);

    const container = document.createElement('div');
    container.className = 'bg-white p-4 border border-gray-200 rounded-lg shadow-sm text-left min-h-[180px]';
    container.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h3 class='text-lg font-bold text-indigo-700 flex items-center gap-2'>
          ${memory.title}
        </h3>
        <button onclick="openImageUpload('${memory.id}')" class="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">+ Add Image</button>
      </div>
      ${memory.location ? `<p class='text-sm text-gray-600 mb-2'>📍 ${memory.location}</p>` : ''}
      ${memory.tags ? `<div class="mb-2">${memory.tags.split(/[, ]+/).map(tag => `<span class="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium mr-1 px-2 py-1 rounded-full">${tag}</span>`).join('')}</div>` : ''}
      <div class="flex flex-wrap gap-2">
        ${validImages.length > 0
          ? validImages.map((img, i) => `
            <img src="${img.url}"
                 class="img-thumb w-28 h-28 object-cover rounded-lg cursor-pointer border hover:ring-2 hover:ring-indigo-300"
                 data-index="${i}"
                 data-images='${encodeURIComponent(JSON.stringify(validImages))}' />
          `).join('')
          : ''}
      </div>
    `;
    memoryList.appendChild(container);
  }

  document.querySelectorAll('.img-thumb').forEach(img => {
    const encoded = img.getAttribute('data-images');
    const urls = JSON.parse(decodeURIComponent(encoded));
    const index = parseInt(img.getAttribute('data-index'), 10);
    img.addEventListener('click', () => window.openImageModal(urls, index));
  });
}

loadMemories();
