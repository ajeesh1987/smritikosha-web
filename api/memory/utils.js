import { supabase } from '../../lib/supabaseClient.js'; // Adjusted the relative path

export async function getMemoryDetails(memoryId, supabase) {
  console.log('🔍 Fetching memory for ID:', memoryId);

  const { data, error } = await supabase
    .from('memories')
    .select('id, title, description, tags, location')
    .eq('id', memoryId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch memory details: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No memory found for ID: ${memoryId}`);
  }

  return data;
}
