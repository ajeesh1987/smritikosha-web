// /api/memory/utils.js

import { supabase } from '../../lib/supabaseClient.js'; // Adjusted the relative path

export async function getMemoryDetails(memoryId) {
  const { data, error, count } = await supabase
    .from('memories')
    .select('id, title, description, tags, location')
    .eq('id', memoryId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch memory details: ${error?.message || "No data found."}`);
  }

  if (count > 1) {
    throw new Error("More than one memory found, expected only one.");
  }

  return data;
}
