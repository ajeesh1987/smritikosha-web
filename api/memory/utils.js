import { supabase } from '../../lib/supabaseClient.js'; // Adjusted the relative path

export async function getMemoryDetails(memoryId) {
  console.log('🔍 Fetching memory for ID:', memoryId); // helpful debug log

  const { data, error } = await supabase
    .from('memories')
    .select('id, title, description, tags, location')
    .eq('id', memoryId)
    .maybeSingle(); // allows 0 or 1 row safely

  if (error) {
    throw new Error(`Failed to fetch memory details: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No memory found for ID: ${memoryId}`);
  }

  return data;
}
