import { supabase } from '../lib/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const message = document.getElementById('signup-message');

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

      // Call Supabase signup
      const { error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        message.textContent = `Error: ${error.message}`;
      } else {
        message.style.color = 'green';
        message.textContent = 'Verification email sent. Please check your inbox.';
        signupForm.reset();
      }
    });
  }
});
