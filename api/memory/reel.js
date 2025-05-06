// /api/memory/reel.js
import { createClient } from '@supabase/supabase-js';
import { getMemoryDetails, summarizeText } from './utils.js';
import { getReelVisualFlow } from './generateReelData.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { memoryId } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!memoryId || !token) {
    return res.status(400).json({ error: 'Missing memory ID or auth token' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const memory = await getMemoryDetails(memoryId, supabase);
    const { title, description, tags, location } = memory;

    const summary = await summarizeText(title, description, tags, location);
    const reelData = await getReelVisualFlow(memoryId, user.id, supabase);

    return res.status(200).json({
      memoryId,
      title,
      summary,
      ...reelData, // includes theme, mood, musicStyle, visualFlow
      memoryTags: tags?.split(/[, ]+/).filter(Boolean) || [],
    });

  } catch (error) {
    console.error('Reel generation error:', error);
    return res.status(500).json({ error: 'Failed to generate memory reel.' });
  }
}
