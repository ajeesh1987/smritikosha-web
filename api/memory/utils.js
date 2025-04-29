// /api/memory/utils.js

import { supabase } from '../../lib/supabaseClient'; // Relative import

export async function getMemoryDetails(memoryId) {
  const { data, error } = await supabase
    .from('memories')
    .select('id, title, description, tags, location')
    .eq('id', memoryId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch memory details: ${error.message}`);
  }

  return data;
}
