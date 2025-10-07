import { supabase } from '../../lib/supabaseClient.js';

const form = document.getElementById('signup-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const first_name = form['first-name'].value.trim();
  const email = form.email.value.trim();
  const country = form.country.value.trim();
  const password = form.password.value.trim();
  const confirm = form['confirm-password'].value.trim();
  const termsChecked = form['terms'].checked;

  errorMsg.textContent = '';

  if (!first_name || !email || !country || !password || !confirm) {
    errorMsg.textContent = 'All fields are required.';
    return;
  }

  if (!termsChecked) {
    errorMsg.textContent = 'Please accept the Terms and Conditions.';
    return;
  }

  if (password !== confirm) {
    errorMsg.textContent = 'Passwords do not match.';
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name,
        country,
        terms_accepted_at: new Date().toISOString()
      },
      emailRedirectTo: 'http://localhost:5173/verify-email.html'
    }
  });

  if (error) {
    errorMsg.textContent = `Sign up failed: ${error.message}`;
  } else {
    errorMsg.innerHTML = `
    <div class="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-md text-sm">
       Signup successful! Please check your email to verify your account.
    </div>
  `;
      form.reset();
  }
});
