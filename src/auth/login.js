// src/auth/login.js
import { supabase } from '../../lib/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const message = document.getElementById('login-message');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Clear previous messages
    message.textContent = '';
    message.style.color = 'red';

    if (!email || !password) {
      message.textContent = 'Both email and password are required.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      message.textContent = `Login failed: ${error.message}`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    } else {
      // Redirect to main page after successful login
      window.location.href = './main.html';
    }
  });
});
