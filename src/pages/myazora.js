import { supabase } from '../../lib/supabaseClient.js';

const state = {
  user: null,
  selectedMemoryId: null,
  selectedImageUrl: null,
  selectedStyle: 'ghibli',
  resultImageUrl: null,
};

const LOADING_MESSAGES = [
  'Analysing your image…',
  'Painting the scene…',
  'Adding a touch of magic…',
  'Almost there…',
];

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
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('Failed to fetch memories:', error.message); return; }

  const picker = document.getElementById('memory-picker');
  picker.innerHTML = '<option value="">Select a memory...</option>';
  data.forEach(mem => {
    const opt = document.createElement('option');
    opt.value = mem.id;
    opt.textContent = mem.title;
    picker.appendChild(opt);
  });

  picker.addEventListener('change', async (e) => {
    state.selectedMemoryId = e.target.value;
    state.selectedImageUrl = null;
    updateGenerateButton();
    if (state.selectedMemoryId) {
      await loadMemoryImages(state.selectedMemoryId);
    } else {
      document.getElementById('thumbnails-wrap').classList.add('hidden');
      document.getElementById('no-images-msg').classList.add('hidden');
    }
  });
}

async function loadMemoryImages(memoryId) {
  const { data: images, error } = await supabase
    .from('memory_images')
    .select('id, image_path')
    .eq('memory_id', memoryId)
    .eq('user_id', state.user.id);

  const container = document.getElementById('thumbnails');
  const wrap = document.getElementById('thumbnails-wrap');
  const noMsg = document.getElementById('no-images-msg');
  container.innerHTML = '';

  if (error || !images || images.length === 0) {
    wrap.classList.add('hidden');
    noMsg.classList.remove('hidden');
    return;
  }

  noMsg.classList.add('hidden');
  wrap.classList.remove('hidden');

  for (const img of images) {
    const { data: urlData } = await supabase
      .storage
      .from('memory-images')
      .createSignedUrl(img.image_path, 3600);
    if (!urlData?.signedUrl) continue;

    const thumb = document.createElement('img');
    thumb.src = urlData.signedUrl;
    thumb.className = 'thumb-img';
    thumb.dataset.url = urlData.signedUrl;

    thumb.addEventListener('click', () => {
      state.selectedImageUrl = urlData.signedUrl;
      document.querySelectorAll('.thumb-img').forEach(i => i.classList.remove('selected'));
      thumb.classList.add('selected');
      updateGenerateButton();
    });

    container.appendChild(thumb);
  }
}

function updateGenerateButton() {
  const btn = document.getElementById('generate-btn');
  btn.disabled = !state.selectedImageUrl;
}

function bindUI() {
  // Style chips
  document.getElementById('style-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.style-chip');
    if (!chip) return;
    document.querySelectorAll('.style-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.selectedStyle = chip.dataset.style;
  });

  // Generate
  document.getElementById('generate-btn').addEventListener('click', handleGenerate);

  // Retry
  document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('error-banner').classList.add('hidden');
    state.resultImageUrl = null;
  });

  // Save to existing memory
  document.getElementById('save-existing-btn').addEventListener('click', handleSaveToMemory);
}

async function handleGenerate() {
  if (!state.selectedImageUrl) return;

  hideError();
  document.getElementById('result-section').classList.add('hidden');
  showLoading(true);

  // Cycle loading messages
  let msgIdx = 0;
  const msgEl = document.getElementById('loading-msg');
  msgEl.textContent = LOADING_MESSAGES[0];
  const msgTimer = setInterval(() => {
    msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
    msgEl.textContent = LOADING_MESSAGES[msgIdx];
  }, 2500);

  try {
    const res = await fetch('/api/memory/generateMyazora', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: state.selectedImageUrl,
        style: state.selectedStyle,
      }),
    });

    const result = await res.json().catch(() => null);
    if (!result || !result.imageUrl) {
      throw new Error(result?.error || 'No image returned from the server.');
    }

    state.resultImageUrl = result.imageUrl;

    document.getElementById('original-img').src = state.selectedImageUrl;
    const resultImg = document.getElementById('result-img');
    resultImg.src = result.imageUrl;

    const dlBtn = document.getElementById('download-btn');
    dlBtn.href = result.imageUrl;

    document.getElementById('result-section').classList.remove('hidden');
  } catch (err) {
    console.error('Myazora error:', err);
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    clearInterval(msgTimer);
    showLoading(false);
  }
}

async function handleSaveToMemory() {
  if (!state.resultImageUrl || !state.selectedMemoryId) return;

  const btn = document.getElementById('save-existing-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin text-xs"></i> Saving…';

  try {
    // Fetch the image as a blob and upload to Supabase storage
    const blob = await fetch(state.resultImageUrl).then(r => r.blob());
    const filename = `myazora_${Date.now()}.png`;
    const filePath = `${state.user.id}/${state.selectedMemoryId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('memory-images')
      .upload(filePath, blob, { contentType: 'image/png' });

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase
      .from('memory_images')
      .insert({
        memory_id: state.selectedMemoryId,
        user_id: state.user.id,
        image_path: filePath,
        description: `Myazora — ${state.selectedStyle} style`,
        tags: 'myazora ai-art',
      });

    if (dbError) throw dbError;

    showToast('Saved to memory!');
  } catch (err) {
    console.error('Save error:', err);
    showError('Could not save image: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-folder-plus text-xs"></i> Save to memory';
  }
}

function showLoading(on) {
  document.getElementById('loading-section').classList.toggle('hidden', !on);
  const btn = document.getElementById('generate-btn');
  btn.disabled = on;
  document.getElementById('generate-label').textContent = on ? 'Working…' : 'Myazorify';
}

function showError(msg) {
  document.getElementById('error-detail').textContent = msg;
  document.getElementById('error-banner').classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-banner').classList.add('hidden');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}

document.addEventListener('DOMContentLoaded', init);
