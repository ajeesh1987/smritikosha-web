import { supabase } from '../../lib/supabaseClient.js';

const params = new URLSearchParams(window.location.search);
const memoryId = params.get('id');
const form = document.getElementById('add-image-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const file = document.getElementById('image-file').files[0];
  if (!file) {
    errorMsg.textContent = 'Please select an image.';
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const safeName = file.name.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
  const filePath = `${user.id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('memory-images')
    .upload(filePath, file);

  if (uploadError) {
    errorMsg.textContent = 'Upload failed.';
    console.error(uploadError);
    return;
  }

  const { error: insertError } = await supabase.from('memory_images').insert([
    { memory_id: memoryId, image_path: filePath }
  ]);

  if (insertError) {
    errorMsg.textContent = 'Image metadata save failed.';
    console.error(insertError);
    return;
  }

  window.location.href = `./memory.html?id=${memoryId}`;
});
