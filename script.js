// script.js (or your main entry file)
import { supabase } from './lib/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Handle tokens in URL automatically
  const { data, error } = await supabase.auth.getSession();

  // Clear tokens from URL
  if (window.location.hash && window.location.hash.includes('access_token')) {
    history.replaceState({}, document.title, window.location.pathname);
  }

  if (data.session) {
    console.log('User is logged in:', data.session.user.email);
    // You could redirect user here to dashboard or login page directly
    window.location.href = './login.html';
  }
});
