// src/memory/reelActions.js
import { supabase } from '../lib/supabaseClient';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export async function saveReel({ memoryId, title, summary, previewData }) {
  const token = await getToken();
  const res = await fetch('/api/memory/saveReel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ memoryId, title, summary, reelData: previewData })
  });
  if (!res.ok) throw new Error('Save failed');
  const { reelId } = await res.json();
  return reelId;
}

export async function publishReel({ reelId }) {
  const token = await getToken();
  const res = await fetch('/api/memory/publishReel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reelId })
  });
  if (!res.ok) throw new Error('Publish failed');
  return res.json(); // { viewUrl, posterUrl, videoUrl, reelId }
}

export async function downloadReelSaved({ reelId, fileName }) {
  const token = await getToken();
  const res = await fetch('/api/memory/downloadReel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reelId })
  });
  if (!res.ok) throw new Error('Download prep failed');
  const { downloadUrl, fileName: serverName } = await res.json();

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName || serverName || 'smritikosha_reel.mp4';
  a.click();
}

export async function downloadReelEphemeral({ previewData, title }) {
  const token = await getToken();
  const res = await fetch('/api/memory/downloadReel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ ephemeral: true, renderParams: previewData, title })
  });
  if (!res.ok) throw new Error('Download stream failed');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || 'smritikosha_reel').replace(/\s+/g, '_')}.mp4`;
  a.click();
  URL.revokeObjectURL(url);
}
