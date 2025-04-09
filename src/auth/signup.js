import { supabase } from '../../lib/supabaseClient.js';

const form = document.getElementById('signup-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const confirm = document.getElementById('confirm-password').value.trim();

  errorMsg.textContent = '';

  if (!email || !password || !confirm) {
    errorMsg.textContent = 'All fields are required.';
    return;
  }

  if (password !== confirm) {
    errorMsg.textContent = 'Passwords do not match.';
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    errorMsg.textContent = `Sign up failed: ${error.message}`;
  } else {
    window.location.href = './verify-email.html';
  }
});
