import { supabase } from '../../lib/supabaseClient.js';

export async function openImageModalFromMap(imageId) {
  const imageModal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-image');
  const modalLocation = document.getElementById('modal-location');
  const modalDescription = document.getElementById('modal-description');
  const modalInfoPanel = document.getElementById('modal-info-panel');

  if (!imageModal || !modalImg || !modalLocation || !modalDescription || !modalInfoPanel) {
    console.warn(' Modal elements not found in DOM');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: image, error } = await supabase
    .from('memory_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (error || !image) {
    console.error(' Could not fetch image:', error);
    return;
  }

  const { data: urlData } = await supabase
    .storage
    .from('memory-images')
    .createSignedUrl(image.image_path, 3600);

  if (!urlData?.signedUrl) {
    console.error(' No signed URL found');
    return;
  }

  modalImg.src = urlData.signedUrl;
  modalLocation.textContent = image.location || '';
  modalDescription.textContent = image.description || '';
  const showInfo = image.location || image.description;
  modalInfoPanel.classList.toggle('hidden', !showInfo);
  modalInfoPanel.style.display = showInfo ? 'block' : 'none';
  imageModal.classList.remove('hidden');
}

export function setupImageModalEvents() {
  const close = () => document.getElementById('image-modal')?.classList.add('hidden');

  document.getElementById('modal-close')?.addEventListener('click', close);
  window.addEventListener('keydown', e => e.key === 'Escape' && close());
  document.getElementById('image-modal')?.addEventListener('click', e => {
    if (e.target.id === 'image-modal') close();
  });
}
