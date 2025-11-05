// /api/memory/saveReel.js
import { createClient } from '@supabase/supabase-js';
import { insertReel, buildRenderParams } from '../../reelsRepo.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { memoryId, title, summary, reelData } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!memoryId || !token) return res.status(400).json({ error: 'Missing memoryId or auth token' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const renderParams = buildRenderParams(reelData);
    const row = await insertReel(supabase, {
      userId: user.id,
      memoryId,
      title,
      summary,
      renderParams
    });
    return res.status(200).json({ reelId: row.id, status: row.status });
  } catch (e) {
    console.error('Save reel error', e);
    return res.status(500).json({ error: 'Failed to save reel' });
  }
}
