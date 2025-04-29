// /api/memory/utils.js

import { supabase } from '../../lib/supabaseClient'; // Relative import

export async function getMemoryDetails(memoryId) {
  // Querying memory details for the provided memoryId
  const { data, error, count } = await supabase
    .from('memories')
    .select('id, title, description, tags, location')
    .eq('id', memoryId)
    .single();  // This ensures that only one row is returned

  // If an error occurs or if more than one row is returned, throw an error
  if (error || !data) {
    throw new Error(`Failed to fetch memory details: ${error?.message || "No data found."}`);
  }

  // If count > 1, then we are getting multiple rows, which is not expected
  if (count > 1) {
    throw new Error("More than one memory found, expected only one.");
  }

  return data;
}
