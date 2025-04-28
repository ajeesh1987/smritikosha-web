import { supabase } from '../../lib/supabaseClient.js';

const params = new URLSearchParams(window.location.search);
const memoryId = params.get('id');

const form = document.getElementById('edit-memory-form');
const title = document.getElementById('title');
const location = document.getElementById('location');
const tags = document.getElementById('tags');
const description = document.getElementById('description');

async function loadMemory() {
  const { data, error } = await supabase.from('memories').select('*').eq('id', memoryId).single();
  if (error || !data) {
    alert('Failed to load memory.');
    return;
  }
  title.value = data.title;
  location.value = data.location || '';
  tags.value = data.tags || '';
  description.value = data.description || '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const updates = {
    title: title.value.trim(),
    location: location.value.trim(),
    tags: tags.value.trim(),
    description: description.value.trim(),
  };

  const { error } = await supabase.from('memories').update(updates).eq('id', memoryId);

  if (error) {
    alert('Failed to update memory.');
  } else {
    window.location.href = `./memory.html?id=${memoryId}`;
  }
});

loadMemory();
