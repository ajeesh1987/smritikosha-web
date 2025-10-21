import { supabase } from './lib/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.hash && window.location.hash.includes('access_token')) {
    history.replaceState({}, document.title, window.location.pathname);
  }

  const { data, error } = await supabase.auth.getSession();

  if (data?.session) {
    console.log('User is logged in:', data.session.user.email);
    window.location.href = '/';
  }
});
