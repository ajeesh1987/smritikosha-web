// src/auth/redirectIfAuthenticated.js
import { supabase } from '../../lib/supabaseClient.js';

export async function redirectIfAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    window.location.href = '/pages/main.html';
  }
}
