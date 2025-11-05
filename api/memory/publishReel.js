// /api/memory/publishReel.js
import { createClient } from '@supabase/supabase-js';
import { reelPaths, makeSlug } from '../_lib/reelPaths.js';
import { getReelById, updateReel } from '../_lib/reelsRepo.js';
import { renderReelToMp4 } from '../_lib/renderReel.js';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { reelId } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!reelId || !token) return res.status(400).json({ error: 'Missing reelId or auth token' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const reel = await getReelById(supabase, reelId);
    if (reel.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

    const paths = reelPaths(user.id, reelId);

    // Render only if we do not already have a public asset
    if (!reel.video_path || !reel.is_public) {
      const result = await renderReelToMp4({ reel, renderParams: reel.render_params });
      const mp4Buf = result.mp4Buffer;
      const jpgBuf = result.posterJpegBuffer;
      const checksum = result.checksum ?? crypto.createHash('sha1').update(mp4Buf).digest('hex');

      const up1 = await supabase.storage.from('reels-public')
        .upload(paths.publicVideo, mp4Buf, { contentType: 'video/mp4', upsert: true });
      if (up1.error) throw up1.error;

      const up2 = await supabase.storage.from('reels-public')
        .upload(paths.publicPoster, jpgBuf, { contentType: 'image/jpeg', upsert: true });
      if (up2.error) throw up2.error;

      await updateReel(supabase, reelId, {
        is_public: true,
        status: 'ready',
        public_slug: reel.public_slug || makeSlug(),
        video_path: paths.publicVideo,
        poster_path: paths.publicPoster,
        file_size_bytes: mp4Buf.byteLength,
        checksum,
        duration_seconds: result.durationSeconds ?? reel.duration_seconds ?? null,
        published_at: new Date().toISOString()
      });
    }

    const base = process.env.PUBLIC_APP_URL || 'https://smritikosha.com';
    const viewUrl = `${base}/reel/${reel.public_slug || makeSlug()}`;
    const posterUrl = `${base}/storage/v1/object/public/reels-public/${paths.publicPoster}`;
    const videoUrl = `${base}/storage/v1/object/public/reels-public/${paths.publicVideo}`;

    return res.status(200).json({
      reelId,
      viewUrl,
      posterUrl,
      videoUrl
    });
  } catch (e) {
    if (String(e.message || '').includes('row not found')) {
      return res.status(409).json({ error: 'Save required before publish' });
    }
    console.error('Publish error', e);
    return res.status(500).json({ error: 'Failed to publish reel' });
  }
}
