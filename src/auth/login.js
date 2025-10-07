import { supabase } from '../../lib/supabaseClient.js';

const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = form.email.value.trim();
  const password = form.password.value.trim();
  errorMsg.textContent = '';

  if (!email || !password) {
    errorMsg.textContent = 'Both fields are required.';
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorMsg.textContent = `Login failed: ${error.message}`;
    return;
  }

  //  Login succeeded
  window.location.href = './main.html';
});
