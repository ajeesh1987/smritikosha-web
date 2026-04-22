// /api/memory/saveReel.js
import { createClient } from '@supabase/supabase-js';
import { insertReel, buildRenderParams } from '../../lib/reelsRepo.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { memoryId, title, summary, reelData, reelType } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(400).json({ error: 'Missing auth token' });

  // Use anon key so RLS applies. Service role should be reserved for trusted jobs.
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Verify memory ownership — skipped for year_in_review reels (no single parent memory)
    if (memoryId) {
      const { data: mem, error: memErr } = await supabase
        .from('memories')
        .select('id, user_id')
        .eq('id', memoryId)
        .single();

      if (memErr || !mem) return res.status(404).json({ error: 'Memory not found' });
      if (mem.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
    }

    const renderParams = buildRenderParams(reelData || {});
    const row = await insertReel(supabase, {
      userId: user.id,
      memoryId:  memoryId  || null,
      reelType:  reelType  || 'memory',
      title:     title?.trim()   || null,
      summary:   summary?.trim() || null,
      renderParams
    });

    return res.status(200).json({ reelId: row.id, status: row.status });
  } catch (e) {
    console.error('saveReel error', e);
    return res.status(500).json({ error: 'Failed to save reel' });
  }
}
