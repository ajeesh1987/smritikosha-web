// src/memory/reelUI.js

// Generic POST helper that returns either JSON or a Blob
async function postJSONorBlob(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status} ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.blob();
}

// API wrappers

async function saveReel(payload) {
  const data = await postJSONorBlob('/api/memory/saveReel', payload);
  if (!data || !data.reelId) throw new Error('Missing reelId in response');
  return data.reelId;
}

async function publishReel({ reelId }) {
  const data = await postJSONorBlob('/api/memory/publishReel', { reelId });
  // Expecting { viewUrl, videoUrl }
  return data || {};
}

async function downloadReelSaved({ reelId, fileName }) {
  const out = await postJSONorBlob('/api/memory/downloadReel', { reelId });
  await handleDownload(out, fileName);
}

async function downloadReelEphemeral({ previewData, title }) {
  const out = await postJSONorBlob('/api/memory/downloadReel', {
    previewData,
    title,
    mode: 'ephemeral',
  });
  const fileName = `${(title || 'smritikosha_reel').replace(/\s+/g, '_')}.mp4`;
  await handleDownload(out, fileName);
}

// If API returns a Blob, download it
// If API returns JSON with a url, fetch and download or just open it
async function handleDownload(out, fileName) {
  if (out instanceof Blob) {
    const url = URL.createObjectURL(out);
    triggerDownload(url, fileName);
    URL.revokeObjectURL(url);
    return;
  }
  if (out && out.url) {
    // Try to fetch and save with filename, fallback to opening the URL
    try {
      const res = await fetch(out.url);
      if (!res.ok) throw new Error('Bad status for signed URL');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, fileName);
      URL.revokeObjectURL(url);
    } catch {
      window.open(out.url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  throw new Error('Unexpected download response');
}

function triggerDownload(url, fileName) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'download.mp4';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// memoryId -> { reelId, previewData }
const reelState = new Map();

export function mountReelActionsForMemory(memoryId, previewData) {
  reelState.set(memoryId, { reelId: null, previewData });

  const card = document.querySelector(`[data-memory-id="${memoryId}"]`);
  if (!card) return;
  if (card.querySelector('.sk-reel-actions')) return;

  const bar = document.createElement('div');
  bar.className = 'sk-reel-actions mt-3 flex gap-2 items-center';
  bar.innerHTML = `
    <button class="sk-reel-save bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm">Save</button>
    <button class="sk-reel-share bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm">Share</button>
    <button class="sk-reel-download bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm">Download</button>
    <span class="sk-reel-status text-xs text-gray-500 ml-2"></span>
  `;
  card.appendChild(bar);

  const elSave = bar.querySelector('.sk-reel-save');
  const elShare = bar.querySelector('.sk-reel-share');
  const elDown = bar.querySelector('.sk-reel-download');
  const elStatus = bar.querySelector('.sk-reel-status');

  const setStatus = (msg) => {
    elStatus.textContent = msg;
    clearTimeout(elStatus._t);
    if (!msg) return;
    elStatus._t = setTimeout(() => { elStatus.textContent = ''; }, 2000);
  };

  elSave.onclick = async () => {
    try {
      const st = reelState.get(memoryId);
      const { previewData } = st || {};
      if (!previewData) return;
      const reelId = await saveReel({
        memoryId,
        title: previewData.title,
        summary: previewData.summary,
        previewData,
      });
      reelState.set(memoryId, { ...st, reelId });
      setStatus('Saved');
    } catch (e) {
      console.error(e);
      setStatus('Save failed');
    }
  };

  elShare.onclick = async () => {
    try {
      let st = reelState.get(memoryId);
      const { previewData } = st || {};
      if (!previewData) return;

      let { reelId } = st || {};
      if (!reelId) {
        reelId = await saveReel({
          memoryId,
          title: previewData.title,
          summary: previewData.summary,
          previewData,
        });
        st = { ...st, reelId };
        reelState.set(memoryId, st);
      }

      const { viewUrl, videoUrl } = await publishReel({ reelId });
      const urlToShare = viewUrl || videoUrl;

      try {
        if (navigator.share && urlToShare) {
          await navigator.share({
            title: previewData.title || 'My SmritiKosha Reel',
            url: urlToShare,
          });
          setStatus('Shared');
        } else if (urlToShare) {
          await navigator.clipboard.writeText(urlToShare);
          setStatus('Link copied');
        } else {
          throw new Error('No shareable URL returned');
        }
      } catch {
        if (urlToShare) {
          await navigator.clipboard.writeText(urlToShare);
          setStatus('Link copied');
        } else {
          setStatus('Share failed');
        }
      }
    } catch (e) {
      console.error(e);
      setStatus('Share failed');
    }
  };

  elDown.onclick = async () => {
    try {
      const st = reelState.get(memoryId);
      const { reelId, previewData } = st || {};
      if (reelId) {
        await downloadReelSaved({
          reelId,
          fileName: `${(previewData?.title || 'smritikosha_reel').replace(/\s+/g, '_')}.mp4`,
        });
      } else {
        await downloadReelEphemeral({
          previewData,
          title: previewData?.title,
        });
      }
      setStatus('Download started');
    } catch (e) {
      console.error(e);
      setStatus('Download failed');
    }
  };
}

export function unmountReelActionsForMemory(memoryId) {
  const card = document.querySelector(`[data-memory-id="${memoryId}"]`);
  card?.querySelector('.sk-reel-actions')?.remove();
  reelState.delete(memoryId);
}
