// src/memory/main.js
import { supabase } from '../../lib/supabaseClient.js';
console.log('✅ main.js loaded and running');

const memoryList = document.getElementById('memory-list');
const modal = document.getElementById('modal');
const form = document.getElementById('memory-form');

function openModal() {
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  form.reset();
}

function showImageModal(src) {
  const modal = document.getElementById('image-modal');
  const img = document.getElementById('modal-image');
  img.src = src;
  modal.classList.remove('hidden');
}

function closeImageModal() {
  document.getElementById('image-modal').classList.add('hidden');
  document.getElementById('modal-image').src = '';
}

async function loadMemories() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/pages/login.html';
    return;
  }

  const { data: memories, error: memError } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (memError || !memories || memories.length === 0) {
    memoryList.innerHTML = `<p class='text-gray-600 text-center'>You don't have any memories yet. Create your first one and begin the journey.</p>`;
    return;
  }

  memoryList.innerHTML = '';

  for (const memory of memories) {
    const { data: images, error: imgError } = await supabase
      .from('memory_images')
      .select('image_path')
      .eq('memory_id', memory.id);

    const imageUrls = await Promise.all(
      (images || []).map(async (img) => {
        const { data: signed } = await supabase.storage
          .from('memory-images')
          .createSignedUrl(img.image_path, 3600);
        return signed?.signedUrl;
      })
    );

    const container = document.createElement('div');
    container.className = 'bg-white p-4 border border-gray-200 rounded-lg shadow-sm text-left';

    container.innerHTML = `
      <h3 class='text-lg font-bold text-indigo-700 mb-2'>${memory.title}</h3>
      ${memory.location ? `<p class='text-sm text-gray-600 mb-2'>📍 ${memory.location}</p>` : ''}
      ${memory.tags ? `<div class="mb-2">${memory.tags.split(/[, ]+/).map(tag => `<span class="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium mr-1 px-2 py-1 rounded-full">${tag}</span>`).join('')}</div>` : ''}
      <div class="flex flex-wrap gap-2">
        ${imageUrls.map(url => `
          <img src="${url}" class="w-28 h-28 object-cover rounded-lg cursor-pointer border hover:ring-2 hover:ring-indigo-300" onclick="showImageModal('${url}')" />
        `).join('')}
      </div>
    `;

    memoryList.appendChild(container);
  }
}

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

  const { data: memoryData, error: createError } = await supabase
    .from('memories')
    .insert([{ user_id: user.id, title, location, tags: tagString }])
    .select();

  if (createError || !memoryData || memoryData.length === 0) {
    alert('Failed to create memory.');
    console.error(createError);
    return;
  }

  const memoryId = memoryData[0].id;
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

loadMemories();
document.getElementById('add-memory-btn').addEventListener('click', openModal);
window.showImageModal = showImageModal;
window.closeImageModal = closeImageModal;
