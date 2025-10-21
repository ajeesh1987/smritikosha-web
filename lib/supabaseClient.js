import { createClient } from '@supabase/supabase-js';

const isFrontend = typeof window !== 'undefined';

let supabaseUrl, supabaseAnonKey;
if (isFrontend) {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
} else {
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sk-auth'
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session?.expires_at) {
      localStorage.setItem('sk.session.issuedAt', String(Date.now()));
      localStorage.setItem('sk.session.expiresAt', String(session.expires_at * 1000));
    }
  }
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('sk.session.issuedAt');
    localStorage.removeItem('sk.session.expiresAt');
    localStorage.removeItem('sk.session.lastActivity');
  }
});
