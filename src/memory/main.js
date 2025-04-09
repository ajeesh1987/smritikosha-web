// src/memory/main.js
import { supabase } from '../../lib/supabaseClient.js';
console.log('✅ main.js loaded');

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

let modalImages = [];
let currentImageIndex = 0;
let currentMemoryId = null;

document.getElementById('add-memory-btn').addEventListener('click', () => {
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

window.closeImageModal = () => {
  imageModal.classList.add('hidden');
};

window.closeRenameModal = () => {
  renameModal.classList.add('hidden');
};

window.closeDeleteModal = () => {
  deleteModal.classList.add('hidden');
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
  const { error } = await supabase
    .from('memories')
    .update({ title: newTitle })
    .eq('id', currentMemoryId);

  if (error) {
    alert('Rename failed.');
    console.error(error);
  }

  currentMemoryId = null;
  renameModal.classList.add('hidden');
  loadMemories();
});

deleteConfirmBtn?.addEventListener('click', async () => {
  await supabase.from('memory_images').delete().eq('memory_id', currentMemoryId);
  await supabase.from('memories').delete().eq('id', currentMemoryId);
  currentMemoryId = null;
  deleteModal.classList.add('hidden');
  loadMemories();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('memory-title').value.trim();
  const location = document.getElementById('memory-location').value.trim();
  const tagsRaw = document.getElementById('memory-tags').value.trim();
  const imageInput = document.getElementById('memory-image');

  if (!title || !imageInput.files.length) {
    alert('Memory title and image are required.');
    return;
  }

  const tagArray = tagsRaw.split(/[, ]+/).filter(Boolean).slice(0, 5);
  const tagString = tagArray.join(' ');

  const { data: { user } } = await supabase.auth.getUser();

  const { data: existingMemory } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .eq('title', title)
    .maybeSingle();

  let memoryId;
  if (existingMemory) {
    memoryId = existingMemory.id;
  } else {
    const { data: newMemory, error: createError } = await supabase
      .from('memories')
      .insert([{ user_id: user.id, title, location, tags: tagString }])
      .select()
      .single();

    if (createError) {
      alert('Failed to create memory.');
      console.error(createError);
      return;
    }

    memoryId = newMemory.id;
  }

  const file = imageInput.files[0];
  const safeName = file.name.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
  const filePath = `${user.id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('memory-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    alert('Image upload failed.');
    console.error(uploadError);
    return;
  }

  const { error: imgInsertError } = await supabase.from('memory_images').insert([
    {
      memory_id: memoryId,
      image_path: filePath
    }
  ]);

  if (imgInsertError) {
    alert('Image record insert failed.');
    console.error(imgInsertError);
    return;
  }

  closeModal();
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

  memoryList.innerHTML = '';

  for (const memory of memories) {
    const { data: images } = await supabase
      .from('memory_images')
      .select('image_path')
      .eq('memory_id', memory.id);

    if (!images || images.length === 0) continue;

    const imageUrls = await Promise.all(
      images.map(async (img) => {
        const { data: signed } = await supabase.storage
          .from('memory-images')
          .createSignedUrl(img.image_path, 3600);
        return signed?.signedUrl;
      })
    );

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
        ${imageUrls.map((url, i) => `
          <img src="${url}" 
               class="img-thumb w-28 h-28 object-cover rounded-lg cursor-pointer border hover:ring-2 hover:ring-indigo-300"
               data-index="${i}" 
               data-images='${JSON.stringify(imageUrls)}' />
        `).join('')}
      </div>
    `;

    memoryList.appendChild(container);
  }

  // Attach event listeners AFTER rendering
  document.querySelectorAll('.img-thumb').forEach(img => {
    img.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      const urls = JSON.parse(e.currentTarget.dataset.images);
      openImageModal(urls, index);
    });
  });

  document.querySelectorAll('.rename-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const title = btn.dataset.title;
      openRenameModal(id, title);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openDeleteModal(id);
    });
  });
}

loadMemories();
window.openImageModal = openImageModal;
window.openRenameModal = openRenameModal;
window.openDeleteModal = openDeleteModal;
