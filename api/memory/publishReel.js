// /api/memory/publishReel.js
import { createClient } from '@supabase/supabase-js';
import { reelPaths, makeSlug } from '../../lib/reelPath.js';
import { getReelById, updateReel } from '../../lib/reelsRepo.js';
import { renderReelToMp4 } from '../../lib/renderReel.js';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reelId } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!reelId || !token) {
    return res.status(400).json({ error: 'Missing reelId or auth token' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const reel = await getReelById(supabase, reelId);
    if (reel.user_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const paths = reelPaths(user.id, reelId);
    let finalVideoPath = reel.video_path;
    let finalPosterPath = reel.poster_path;
    let slug = reel.public_slug || makeSlug();

    // Render and upload to public if not already public
    if (!reel.is_public || !reel.video_path) {
      const result = await renderReelToMp4({ reel, renderParams: reel.render_params });
      const mp4Buf = result.mp4Buffer;
      const jpgBuf = result.posterJpegBuffer;
      const checksum =
        result.checksum ?? crypto.createHash('sha1').update(mp4Buf).digest('hex');

      const upVid = await supabase.storage
        .from('reels-public')
        .upload(paths.publicVideo, mp4Buf, {
          contentType: 'video/mp4',
          upsert: true,
        });
      if (upVid.error) throw upVid.error;

      if (jpgBuf) {
        const upPoster = await supabase.storage
          .from('reels-public')
          .upload(paths.publicPoster, jpgBuf, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        if (upPoster.error) throw upPoster.error;
        finalPosterPath = paths.publicPoster;
      }

      finalVideoPath = paths.publicVideo;

      await updateReel(supabase, reelId, {
        is_public: true,
        status: 'ready',
        public_slug: slug,
        video_path: finalVideoPath,
        poster_path: finalPosterPath || null,
        file_size_bytes: mp4Buf.byteLength,
        checksum,
        duration_seconds: result.durationSeconds ?? reel.duration_seconds ?? null,
        published_at: new Date().toISOString(),
      });
    }

    const base = process.env.PUBLIC_APP_URL || 'https://smritikosha.com';
    const viewUrl = `${base}/reel/${slug}`;
    const posterUrl = finalPosterPath
      ? `${base}/storage/v1/object/public/reels-public/${finalPosterPath}`
      : null;
    const videoUrl = `${base}/storage/v1/object/public/reels-public/${finalVideoPath}`;

    return res.status(200).json({
      reelId,
      viewUrl,
      posterUrl,
      videoUrl,
    });
  } catch (e) {
    if (String(e.message || '').includes('row not found')) {
      return res.status(409).json({ error: 'Save required before publish' });
    }
    console.error('publishReel error', e);
    return res.status(500).json({
      error: 'Failed to publish reel',
      details: e.message || String(e),
    });
  }
}
