// /api/memory/saveSummary.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { memoryId, summary } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!memoryId || !summary || !token) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Upsert summary
  const { error: dbError } = await supabase
    .from('memory_summaries')
    .upsert({ memory_id: memoryId, summary }, { onConflict: 'memory_id' });

  if (dbError) return res.status(500).json({ error: dbError.message });

  return res.status(200).json({ success: true });
}
