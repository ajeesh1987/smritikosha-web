// src/auth/signup.js
import { supabase } from '../../lib/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');
  const submitBtn = signupForm.querySelector('button[type="submit"]');
  const message = document.getElementById('signup-message');

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Reset message
    message.textContent = '';
    message.style.color = 'red';

    // Basic validation
    if (!email || !password || !confirmPassword) {
      message.textContent = 'All fields are required.';
      return;
    }

    if (password !== confirmPassword) {
      message.textContent = 'Passwords do not match.';
      return;
    }

    // Disable button and update text to prevent multiple submissions
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    // Call Supabase signup
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      message.textContent = `Error: ${error.message}`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    } else {
      // Redirect user to verify-email page for clear instructions
      window.location.href = './verify-email.html';
    }
  });
});
