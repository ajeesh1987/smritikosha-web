    // lib/supabaseClient.js

    import { createClient } from '@supabase/supabase-js'

    // Get Supabase URL and Anon Key from Vite's environment variables
    // IMPORTANT: Variables must start with VITE_ prefix in your .env.local file
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Check if the variables are loaded correctly
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL and Anon Key must be provided in .env.local file with VITE_ prefix.");
      console.error("VITE_SUPABASE_URL:", supabaseUrl); // Log values for debugging
      console.error("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey);
      // Optionally throw an error or handle this case appropriately
      // For now, we'll allow creation but log error - calls will likely fail
      // throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
    }

    // Create and export the Supabase client instance
    export const supabase = createClient(supabaseUrl, supabaseAnonKey);
    