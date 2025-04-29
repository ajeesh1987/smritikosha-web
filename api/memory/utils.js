// /api/memory/utils.js

import { supabase } from '@/lib/supabaseClient'; // Assuming you're using Supabase

// Function to get memory details based on memoryId
export async function getMemoryDetails(memoryId) {
  const { data, error } = await supabase
    .from('memories') // Fetching from the 'memories' table
    .select('id, title, description, tags, location') // Fetching required columns
    .eq('id', memoryId) // Filter by memoryId
    .single(); // We expect only one result

  if (error) {
    throw new Error(`Failed to fetch memory details: ${error.message}`);
  }

  return data; // Returns { id, title, description, tags, location }
}
