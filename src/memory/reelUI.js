// src/memory/reelUI.js

import {
  saveReel as apiSaveReel,
  publishReel as apiPublishReel,
  downloadReelSaved as apiDownloadReelSaved,
  downloadReelEphemeral as apiDownloadReelEphemeral,
} from './reelActions';

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
    elStatus._t = setTimeout(() => {
      elStatus.textContent = '';
    }, 2000);
  };

  elSave.onclick = async () => {
    try {
      const st = reelState.get(memoryId);
      const { previewData } = st || {};
      if (!previewData) return;

      const reelId = await apiSaveReel({
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

      // Save first if we do not yet have a reelId
      if (!reelId) {
        reelId = await apiSaveReel({
          memoryId,
          title: previewData.title,
          summary: previewData.summary,
          previewData,
        });
        st = { ...st, reelId };
        reelState.set(memoryId, st);
      }

      const { viewUrl, videoUrl } = await apiPublishReel({ reelId });
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
      if (!previewData) return;

      if (reelId) {
        await apiDownloadReelSaved({
          reelId,
          fileName: `${(previewData.title || 'smritikosha_reel').replace(/\s+/g, '_')}.mp4`,
        });
      } else {
        await apiDownloadReelEphemeral({
          previewData,
          title: previewData.title,
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
