// lib/reelsRepo.js
export function buildRenderParams(reelData) {
  const { theme, mood, musicStyle, visualFlow, durationSeconds } = reelData || {};
  return { theme, mood, musicStyle, visualFlow, durationSeconds };
}

export async function insertReel(supabase, { userId, memoryId, title, summary, renderParams }) {
  const { data, error } = await supabase
    .from('reels')
    .insert({
      memory_id: memoryId,
      user_id: userId,
      status: 'draft',
      format: 'mp4',
      aspect: '9:16',
      duration_seconds: renderParams.durationSeconds || null,
      render_params: renderParams,
      title,
      summary,
      is_public: false
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReelById(supabase, reelId) {
  const { data, error } = await supabase.from('reels').select('*').eq('id', reelId).single();
  if (error) throw error;
  return data;
}

export async function updateReel(supabase, reelId, patch) {
  const { data, error } = await supabase
    .from('reels')
    .update(patch)
    .eq('id', reelId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
