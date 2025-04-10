// src/memory/main.js
import { supabase } from '../../lib/supabaseClient.js';

const memoryList = document.getElementById('memory-list');
const modal = document.getElementById('modal');
const form = document.getElementById('memory-form');

const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-image');
const renameModal = document.getElementById('rename-modal');
const renameInput = document.getElementById('rename-input');
const renameSaveBtn = document.getElementById('rename-save');
const deleteModal = document.getElementById('delete-modal');
const deleteConfirmBtn = document.getElementById('delete-confirm');
const toast = document.getElementById('toast');

let modalImages = [];
let currentImageIndex = 0;
let currentMemoryId = null;

function showToast(message, success = true) {
  toast.textContent = message;
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg opacity-0 pointer-events-none transition duration-300 z-50 ${success ? 'bg-green-600' : 'bg-red-600'} text-white`;
  toast.classList.add('opacity-100');

  setTimeout(() => {
    toast.classList.remove('opacity-100');
  }, 2500);
}

document.getElementById('add-memory-btn')?.addEventListener('click', () => {
  modal.classList.remove('hidden');
});

document.getElementById('modal-prev')?.addEventListener('click', () => {
  if (currentImageIndex > 0) {
    currentImageIndex--;
    modalImg.src = modalImages[currentImageIndex];
  }
});

document.getElementById('modal-next')?.addEventListener('click', () => {
  if (currentImageIndex < modalImages.length - 1) {
    currentImageIndex++;
    modalImg.src = modalImages[currentImageIndex];
  }
});

window.closeImageModal = () => imageModal.classList.add('hidden');
window.closeRenameModal = () => renameModal.classList.add('hidden');
window.closeDeleteModal = () => deleteModal.classList.add('hidden');
window.closeModal = () => {
  modal.classList.add('hidden');
  form.reset();
};

function openImageModal(urls, index) {
  modalImages = urls;
  currentImageIndex = index;
  modalImg.src = modalImages[currentImageIndex];
  imageModal.classList.remove('hidden');
}

function openRenameModal(memoryId, currentTitle) {
  currentMemoryId = memoryId;
  renameInput.value = currentTitle;
  renameModal.classList.remove('hidden');
}

function openDeleteModal(memoryId) {
  currentMemoryId = memoryId;
  deleteModal.classList.remove('hidden');
}

renameSaveBtn?.addEventListener('click', async () => {
  const newTitle = renameInput.value.trim();
  if (!newTitle) return;

  renameSaveBtn.disabled = true;
  renameSaveBtn.textContent = 'Saving...';

  const { error } = await supabase
    .from('memories')
    .update({ title: newTitle })
    .eq('id', currentMemoryId);

  renameSaveBtn.disabled = false;
  renameSaveBtn.textContent = 'Save';

  if (error) {
    showToast('Rename failed.', false);
    console.error(error);
    return;
  }

  currentMemoryId = null;
  renameModal.classList.add('hidden');
  showToast('Memory renamed successfully!');
  loadMemories();
});

deleteConfirmBtn?.addEventListener('click', async () => {
  deleteConfirmBtn.disabled = true;
  deleteConfirmBtn.textContent = 'Deleting...';

  await supabase.from('memory_images').delete().eq('memory_id', currentMemoryId);
  await supabase.from('memories').delete().eq('id', currentMemoryId);

  deleteConfirmBtn.disabled = false;
  deleteConfirmBtn.textContent = 'Delete';

  currentMemoryId = null;
  deleteModal.classList.add('hidden');
  showToast('Memory deleted.');
  loadMemories();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const saveBtn = form.querySelector('button[type="submit"]');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const title = document.getElementById('memory-title').value.trim();
  const location = document.getElementById('memory-location').value.trim();
  const tagsRaw = document.getElementById('memory-tags').value.trim();
  const imageInput = document.getElementById('memory-image');

  if (!title || !imageInput.files.length) {
    alert('Memory title and image are required.');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Memory';
    return;
  }

  const tagArray = tagsRaw.split(/[, ]+/).filter(Boolean).slice(0, 5);
  const tagString = tagArray.join(' ');

  const { data: { user } } = await supabase.auth.getUser();

  const normalizedTitle = title.toLowerCase().trim();
  const { data: existingMemories } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id);

  const existingMemory = existingMemories?.find(
    (m) => m.title.toLowerCase().trim() === normalizedTitle
  );

  let memoryId = existingMemory?.id;
  if (memoryId) {
    console.log('🔁 Reusing memory:', existingMemory.title, '| ID:', existingMemory.id);
  }

  if (!memoryId) {
    const { data: newMemory, error: createError } = await supabase
      .from('memories')
      .insert([{ user_id: user.id, title, location, tags: tagString }])
      .select()
      .single();

    if (createError) {
      alert('Failed to create memory.');
      console.error(createError);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Memory';
      return;
    }
    console.log('🆕 Created new memory:', newMemory.title, '| ID:', newMemory.id);
    memoryId = newMemory.id;
  }

  const file = imageInput.files[0];
  const safeName = file.name.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
  // Check for duplicate image in memory
  const { data: existingImages } = await supabase
    .from('memory_images')
    .select('image_path')
    .eq('memory_id', memoryId);

  const alreadyExists = existingImages?.some(img => {
    const storedName = img.image_path.split('/').pop()?.split('_').slice(1).join('_');
    return storedName === safeName;
  });

  if (alreadyExists) {
    showToast('This image already exists in this memory.', false);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Memory';
    return;
  }

  const filePath = `${user.id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('memory-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    alert('Image upload failed.');
    console.error(uploadError);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Memory';
    return;
  }

  const { error: imgInsertError } = await supabase.from('memory_images').insert([
    { memory_id: memoryId, image_path: filePath }
  ]);

  if (imgInsertError) {
    alert('Image record insert failed.');
    console.error(imgInsertError);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Memory';
    return;
  }

  modal.classList.add('hidden');
  form.reset();
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Memory';
  showToast('Memory saved!');
  loadMemories();
});

async function loadMemories() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/pages/login.html';
    return;
  }

  const { data: memories } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const { data: allImages } = await supabase
    .from('memory_images')
    .select('memory_id, image_path');

  memoryList.innerHTML = '';

  for (const memory of memories) {
    const relatedImages = allImages.filter(img => img.memory_id === memory.id);
    if (!relatedImages.length) continue;

    const imageUrls = await Promise.all(
      relatedImages.map(async (img) => {
        const { data: signed } = await supabase.storage
          .from('memory-images')
          .createSignedUrl(img.image_path, 3600);
        return signed?.signedUrl;
      })
    );

    const validUrls = imageUrls.filter(Boolean);
    if (!validUrls.length) continue;

    const container = document.createElement('div');
    container.className = 'bg-white p-4 border border-gray-200 rounded-lg shadow-sm text-left';
    container.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h3 class='text-lg font-bold text-indigo-700 flex items-center gap-2'>
          ${memory.title}
          <button class="rename-btn" data-id="${memory.id}" data-title="${memory.title}" title="Rename">
            <i class="fas fa-pen text-xs text-indigo-500 hover:text-indigo-700"></i>
          </button>
        </h3>
        <button class="delete-btn" data-id="${memory.id}" title="Delete">
          <i class="fas fa-trash text-red-500 hover:text-red-700"></i>
        </button>
      </div>
      ${memory.location ? `<p class='text-sm text-gray-600 mb-2'>📍 ${memory.location}</p>` : ''}
      ${memory.tags ? `<div class="mb-2">${memory.tags.split(/[, ]+/).map(tag => `<span class="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium mr-1 px-2 py-1 rounded-full">${tag}</span>`).join('')}</div>` : ''}
      <div class="flex flex-wrap gap-2">
        ${validUrls.map((url, i) => `
          <img src="${url}"
               class="img-thumb w-28 h-28 object-cover rounded-lg cursor-pointer border hover:ring-2 hover:ring-indigo-300"
               data-index="${i}"
               data-images='${JSON.stringify(validUrls)}' />
        `).join('')}
      </div>
    `;
    console.log('🧠 Rendering memory card:', memory.title, '| ID:', memory.id);
    memoryList.appendChild(container);
  }
}

memoryList.addEventListener('click', (e) => {
  const target = e.target.closest('button, img');
  if (!target) return;

  if (target.classList.contains('rename-btn')) {
    const id = target.dataset.id;
    const title = target.dataset.title;
    openRenameModal(id, title);
  } else if (target.classList.contains('delete-btn')) {
    const id = target.dataset.id;
    openDeleteModal(id);
  } else if (target.classList.contains('img-thumb')) {
    const index = parseInt(target.dataset.index, 10);
    const urls = JSON.parse(target.dataset.images);
    openImageModal(urls, index);
  }
});

loadMemories();
window.openImageModal = openImageModal;
window.openRenameModal = openRenameModal;
window.openDeleteModal = openDeleteModal;
