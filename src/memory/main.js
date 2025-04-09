import { supabase } from '../../lib/supabaseClient.js';
console.log('✅ main.js loaded and running');

const memoryList = document.getElementById('memory-list');
const modal = document.getElementById('modal');
const form = document.getElementById('memory-form');

let modalImages = [];
let currentImageIndex = 0;

function openModal() {
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  form.reset();
}

function showImageModal(urls, index) {
  modalImages = urls;
  currentImageIndex = index;
  const modal = document.getElementById('image-modal');
  const img = document.getElementById('modal-image');
  img.src = modalImages[currentImageIndex];
  modal.classList.remove('hidden');
}

function closeImageModal() {
  document.getElementById('image-modal').classList.add('hidden');
}

document.getElementById('modal-prev').addEventListener('click', () => {
  if (currentImageIndex > 0) {
    currentImageIndex--;
    document.getElementById('modal-image').src = modalImages[currentImageIndex];
  }
});

document.getElementById('modal-next').addEventListener('click', () => {
  if (currentImageIndex < modalImages.length - 1) {
    currentImageIndex++;
    document.getElementById('modal-image').src = modalImages[currentImageIndex];
  }
});

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

    if (!images || images.length === 0) continue; // skip empty memories

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
        <h3 class='text-lg font-bold text-indigo-700'>${memory.title}</h3>
        <div class="space-x-2 text-sm">
          <button onclick="renameMemory('${memory.id}', '${memory.title}')" class="text-indigo-600 hover:underline">Rename</button>
          <button onclick="deleteMemory('${memory.id}')" class="text-red-600 hover:underline">Delete</button>
        </div>
      </div>
      ${memory.location ? `<p class='text-sm text-gray-600 mb-2'>📍 ${memory.location}</p>` : ''}
      ${memory.tags ? `<div class="mb-2">${memory.tags.split(/[, ]+/).map(tag => `<span class="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium mr-1 px-2 py-1 rounded-full">${tag}</span>`).join('')}</div>` : ''}
      <div class="flex flex-wrap gap-2">
        ${imageUrls.map((url, i) => `
          <img src="${url}" class="w-28 h-28 object-cover rounded-lg cursor-pointer border hover:ring-2 hover:ring-indigo-300"
            onclick="showImageModal(${JSON.stringify(imageUrls)}, ${i})" />
        `).join('')}
      </div>
    `;

    memoryList.appendChild(container);
  }
}

window.renameMemory = async (memoryId, currentTitle) => {
  const newTitle = prompt('Enter new memory title:', currentTitle);
  if (!newTitle || newTitle === currentTitle) return;

  const { error } = await supabase
    .from('memories')
    .update({ title: newTitle })
    .eq('id', memoryId);

  if (error) {
    alert('Failed to rename memory.');
    console.error(error);
    return;
  }

  loadMemories();
};

window.deleteMemory = async (memoryId) => {
  if (!confirm('Are you sure you want to delete this memory and its images?')) return;

  await supabase.from('memory_images').delete().eq('memory_id', memoryId);
  await supabase.from('memories').delete().eq('id', memoryId);

  loadMemories();
};

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

  const { data: existingMemory, error: findError } = await supabase
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

loadMemories();
