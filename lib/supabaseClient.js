import { createClient } from '@supabase/supabase-js';

// Check if we're in the frontend (Vite) or backend (Node.js)
const isFrontend = typeof window !== 'undefined';

// Initialize supabaseUrl and supabaseAnonKey based on the environment
let supabaseUrl, supabaseAnonKey;

if (isFrontend) {
  // For frontend (Vite), using import.meta.env for VITE_ prefixed variables
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
} else {
  // For backend (Node.js or Vercel), using process.env for non-prefixed variables
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
}

// Console logs for verifying loaded environment variables
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Anon Key:", supabaseAnonKey);

// Check if variables loaded correctly
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL and Anon Key must be provided.");
  console.error("supabaseUrl:", supabaseUrl);
  console.error("supabaseAnonKey:", supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
