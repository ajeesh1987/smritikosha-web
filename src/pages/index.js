// src/pages/index.js
import { supabase } from '../../lib/supabaseClient.js';

document.getElementById('start-btn')?.addEventListener('click', async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    window.location.href = '/pages/main.html';
  } else {
    window.location.href = '/pages/login.html';
  }
});
