import { supabase } from '../../lib/supabaseClient.js';

const state = {
  user: null,
  memories: [],
  selectedMemoryId: null,
  selectedImageUrl: null,
};

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/pages/login.html';
    return;
  }
  state.user = user;
  await loadMemories();
  bindUI();
}

async function loadMemories() {
  const { data, error } = await supabase
    .from('memories')
    .select('id, title')
    .eq('user_id', state.user.id);

  if (error) {
    console.error('Failed to fetch memories:', error.message);
    return;
  }

  state.memories = data;
  const picker = document.getElementById('memory-picker');
  picker.innerHTML = '<option value="">Select memory...</option>';
  data.forEach(mem => {
    const opt = document.createElement('option');
    opt.value = mem.id;
    opt.textContent = mem.title;
    picker.appendChild(opt);
  });

  picker.addEventListener('change', async (e) => {
    state.selectedMemoryId = e.target.value;
    await loadMemoryImages(state.selectedMemoryId);
  });
}

async function loadMemoryImages(memoryId) {
  const { data: images, error } = await supabase
    .from('memory_images')
    .select('id, image_path')
    .eq('memory_id', memoryId)
    .eq('user_id', state.user.id);

  const container = document.getElementById('thumbnails');
  container.innerHTML = '';

  if (error || !images || images.length === 0) {
    console.warn('No images found.');
    return;
  }

  for (const img of images) {
    const { data: urlData } = await supabase
      .storage
      .from('memory-images')
      .createSignedUrl(img.image_path, 3600);
    if (!urlData?.signedUrl) continue;

    const thumb = document.createElement('img');
    thumb.src = urlData.signedUrl;
    thumb.className = 'cursor-pointer border rounded shadow hover:ring-4 hover:ring-indigo-300';
    thumb.style.maxHeight = '160px';
    thumb.dataset.url = urlData.signedUrl;

    thumb.addEventListener('click', () => {
      state.selectedImageUrl = urlData.signedUrl;
      document.querySelectorAll('#thumbnails img').forEach(i => i.classList.remove('ring-4', 'ring-indigo-500'));
      thumb.classList.add('ring-4', 'ring-indigo-500');
    });

    container.appendChild(thumb);
  }
}

function bindUI() {
  const generateBtn = document.getElementById('generate-ghibli');
  const originalImg = document.getElementById('original-image');
  const ghibliImg = document.getElementById('ghibli-image');
  const previewSection = document.getElementById('preview');
  const retryBtn = document.getElementById('retry');

  generateBtn.addEventListener('click', async () => {
    if (!state.selectedImageUrl) return alert('Please select an image first.');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    try {
      const res = await fetch('/api/memory/generateMyazora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: state.selectedImageUrl }),
      });

      const text = await res.text();
      console.log('RAW API RESPONSE:', text);
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse JSON:', err);
        alert('Error: ' + text);
        return;
      }

      if (result.imageUrl) {
        originalImg.src = state.selectedImageUrl;
        ghibliImg.src = result.imageUrl;
        ghibliImg.setAttribute('download', '');
        ghibliImg.setAttribute('alt', 'Ghibli style image');
        ghibliImg.setAttribute('title', 'Right-click to save');

        previewSection.classList.remove('hidden');
      } else {
        alert('Failed to generate image.');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong.');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '✨ Create Ghibli Version';
    }
  });

  retryBtn.addEventListener('click', () => {
    previewSection.classList.add('hidden');
    state.selectedImageUrl = null;
    document.querySelectorAll('#thumbnails img').forEach(i => i.classList.remove('ring-4', 'ring-indigo-500'));
  });
}

document.addEventListener('DOMContentLoaded', init);
