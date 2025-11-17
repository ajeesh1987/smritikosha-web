// /api/memory/downloadReel.js
import { createClient } from '@supabase/supabase-js';
import { reelPaths } from '../../lib/reelPath.js';
import { getReelById, updateReel, buildRenderParams } from '../../lib/reelsRepo.js';
import { renderReelToMp4 } from '../../lib/renderReel.js';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reelId, ephemeral, renderParams: rawParams, title } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(400).json({ error: 'Missing auth token' });
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
    // One time download without saving
    if (ephemeral) {
      // Use same transformation as saveReel so renderReelToMp4 gets what it expects
      const renderParams = buildRenderParams(rawParams || {});
      const reelStub = {
        id: 'ephemeral',
        user_id: user.id,
        title: title || 'smritikosha_reel',
      };

      const result = await renderReelToMp4({ reel: reelStub, renderParams });

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${(title || 'smritikosha_reel').replace(/\s+/g, '_')}.mp4"`
      );
      return res.status(200).send(Buffer.from(result.mp4Buffer));
    }

    // Saved reel path
    if (!reelId) {
      return res.status(400).json({ error: 'Missing reelId or set ephemeral true' });
    }

    const reel = await getReelById(supabase, reelId);
    if (reel.user_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const paths = reelPaths(user.id, reelId);

    // If not rendered to private yet, render and upload
    if (!reel.video_path || !reel.video_path.startsWith(`${user.id}/`)) {
      const result = await renderReelToMp4({ reel, renderParams: reel.render_params });
      const checksum =
        result.checksum ?? crypto.createHash('sha1').update(result.mp4Buffer).digest('hex');

      const upVideo = await supabase.storage
        .from('reels-private')
        .upload(paths.privateVideo, result.mp4Buffer, {
          contentType: 'video/mp4',
          upsert: true,
        });
      if (upVideo.error) throw upVideo.error;

      if (result.posterJpegBuffer) {
        const upPoster = await supabase.storage
          .from('reels-private')
          .upload(paths.privatePoster, result.posterJpegBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        if (upPoster.error) throw upPoster.error;
      }

      await updateReel(supabase, reelId, {
        video_path: paths.privateVideo,
        poster_path: result.posterJpegBuffer
          ? paths.privatePoster
          : reel.poster_path || null,
        file_size_bytes: result.mp4Buffer.byteLength,
        checksum,
        status: 'ready',
      });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('reels-private')
      .createSignedUrl(paths.privateVideo, 60 * 15);
    if (signErr) throw signErr;

    const safeName = `${(reel.title || 'smritikosha_reel').replace(/\s+/g, '_')}.mp4`;

    return res.status(200).json({
      reelId,
      downloadUrl: signed.signedUrl,
      fileName: safeName,
    });
  } catch (e) {
    console.error('downloadReel error', e);
    return res.status(500).json({
      error: 'Failed to prepare download',
      details: e.message || String(e),
    });
  }
}
