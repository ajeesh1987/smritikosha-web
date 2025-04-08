// src/main.js
import { supabase } from '../lib/supabaseClient.js';
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
    window.location.href = './login.html';
    return;
  }

  const { data: memories, error } = await supabase.from('memories').select('*').eq('user_id', user.id);
  if (error) {
    memoryList.innerHTML = `<p class='text-red-500'>Something went wrong loading memories.</p>`;
    return;
  }

  if (memories.length === 0) {
    memoryList.innerHTML = `<p class='text-gray-600 text-center'>You don't have any memories yet. Create your first one and begin the journey.</p>`;
    return;
  }

  memoryList.innerHTML = '';

  for (const memory of memories) {
    const { data: images, error: imgError } = await supabase
      .from('memory_images')
      .select('image_path')
      .eq('memory_id', memory.id);

    if (imgError || !images || images.length === 0) continue;

    const imagePreviews = await Promise.all(images.map(async (img) => {
      const { data: signedUrlData } = await supabase.storage
        .from('memory-images')
        .createSignedUrl(img.image_path, 3600);
      return signedUrlData?.signedUrl;
    }));

    const div = document.createElement('div');
    div.className = 'bg-white p-4 border border-gray-200 rounded-lg shadow-sm text-left';

    div.innerHTML = `
      <h3 class='text-lg font-semibold text-indigo-700 mb-1'>${memory.title}</h3>
      ${memory.location ? `<p class='text-sm text-gray-600'>📍 ${memory.location}</p>` : ''}
      ${memory.tags ? `<p class='text-sm text-gray-500 mt-1'>${memory.tags.split(' ').map(t => `<span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs mr-1">${t}</span>`).join('')}</p>` : ''}
      ${imagePreviews.map((url, i) => `
        <p class='text-sm text-gray-600 mt-2'>🖼️ <span class="text-indigo-600 underline cursor-pointer" onclick="showImageModal('${url}')">View Image ${i + 1}</span></p>
      `).join('')}
    `;

    memoryList.appendChild(div);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('memory-title').value.trim();
  const location = document.getElementById('memory-location').value.trim();
  const tags = document.getElementById('memory-tags').value.trim();
  const imageInput = document.getElementById('memory-image');

  if (!title || !imageInput.files.length) {
    alert('Memory title and image are required.');
    return;
  }

  const tagArray = tags.split(/\s+/).filter(t => t.trim() !== '');
  if (tagArray.length > 5) {
    alert('Please limit tags to 5 max.');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data: memoryData, error: createError } = await supabase
    .from('memories')
    .insert([{ user_id: user.id, title, location, tags }])
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
