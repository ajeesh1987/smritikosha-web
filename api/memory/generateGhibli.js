// public/js/ghibli.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const state = {
  user: null,
  selectedFile: null,
  previewUrl: null,
  ghibliUrl: null,
};

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }
  state.user = user;
  bindUI();
}

function bindUI() {
  const uploadInput = document.getElementById('ghibli-upload');
  const generateBtn = document.getElementById('generate-ghibli');
  const previewImg = document.getElementById('preview-img');

  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      state.selectedFile = file;
      state.previewUrl = URL.createObjectURL(file);
      previewImg.src = state.previewUrl;
    }
  });

  generateBtn.addEventListener('click', async () => {
    if (!state.selectedFile) return alert('Please upload an image.');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    const formData = new FormData();
    formData.append('image', state.selectedFile);

    try {
      const res = await fetch('/api/ghibli-generate', {
        method: 'POST',
        body: formData,
      });
      const { imageUrl } = await res.json();
      document.getElementById('ghibli-img').src = imageUrl;
      state.ghibliUrl = imageUrl;
    } catch (err) {
      alert('Failed to generate Ghibli image.');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
