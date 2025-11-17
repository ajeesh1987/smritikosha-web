// src/memory/reelUI.js

import { supabase } from '../../lib/supabaseClient.js';

// --------- API helpers (client side, with auth) ----------

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function saveReelApi({ memoryId, title, summary, previewData }) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/memory/saveReel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      memoryId,
      title,
      summary,
      reelData: previewData,
    }),
  });

  if (!res.ok) throw new Error("Save failed");
  const { reelId } = await res.json();
  if (!reelId) throw new Error("Missing reelId");
  return reelId;
}

async function publishReelApi({ reelId }) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/memory/publishReel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reelId }),
  });

  if (!res.ok) throw new Error("Publish failed");
  return res.json(); // { viewUrl, posterUrl, videoUrl, reelId }
}

async function downloadReelSavedApi({ reelId, fileName }) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/memory/downloadReel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reelId }),
  });

  if (!res.ok) throw new Error("Download prep failed");
  const { downloadUrl, fileName: serverName } = await res.json();

  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = fileName || serverName || "smritikosha_reel.mp4";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadReelEphemeralApi({ previewData, title }) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/memory/downloadReel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ephemeral: true,
      renderParams: previewData,
      title,
    }),
  });

  if (!res.ok) throw new Error("Download stream failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "smritikosha_reel").replace(/\s+/g, "_")}.mp4`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --------- State ---------

// memoryId -> { reelId, previewData }
const reelState = new Map();

// --------- Shared UI helper ----------

function createReelActionsBar(rootEl, memoryId, previewData) {
  if (!rootEl || !previewData) return;

  if (rootEl.querySelector(".sk-reel-actions")) return;

  const existing = reelState.get(memoryId) || { reelId: null, previewData: null };
  reelState.set(memoryId, { ...existing, previewData });

  const bar = document.createElement("div");
  bar.className = "sk-reel-actions mt-3 flex gap-2 items-center";
  bar.innerHTML = `
    <button class="sk-reel-save bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm">Save</button>
    <button class="sk-reel-share bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm">Share</button>
    <button class="sk-reel-download bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm">Download</button>
    <span class="sk-reel-status text-xs text-gray-500 ml-2"></span>
  `;
  rootEl.appendChild(bar);

  const elSave = bar.querySelector(".sk-reel-save");
  const elShare = bar.querySelector(".sk-reel-share");
  const elDown = bar.querySelector(".sk-reel-download");
  const elStatus = bar.querySelector(".sk-reel-status");

  const setStatus = (msg) => {
    elStatus.textContent = msg;
    clearTimeout(elStatus._t);
    if (!msg) return;
    elStatus._t = setTimeout(() => {
      elStatus.textContent = "";
    }, 2000);
  };

  elSave.onclick = async () => {
    try {
      const st = reelState.get(memoryId);
      const { previewData: pd } = st || {};
      if (!pd) return;

      const reelId = await saveReelApi({
        memoryId,
        title: pd.title,
        summary: pd.summary,
        previewData: pd,
      });

      reelState.set(memoryId, { ...st, reelId });
      setStatus("Saved");
    } catch (e) {
      console.error(e);
      setStatus("Save failed");
    }
  };

  elShare.onclick = async () => {
    try {
      let st = reelState.get(memoryId);
      const { previewData: pd } = st || {};
      if (!pd) return;

      let { reelId } = st || {};

      if (!reelId) {
        reelId = await saveReelApi({
          memoryId,
          title: pd.title,
          summary: pd.summary,
          previewData: pd,
        });
        st = { ...st, reelId };
        reelState.set(memoryId, st);
      }

      const { viewUrl, videoUrl } = await publishReelApi({ reelId });
      const urlToShare = viewUrl || videoUrl;

      try {
        if (navigator.share && urlToShare) {
          await navigator.share({
            title: pd.title || "My SmritiKosha Reel",
            url: urlToShare,
          });
          setStatus("Shared");
        } else if (urlToShare) {
          await navigator.clipboard.writeText(urlToShare);
          setStatus("Link copied");
        } else {
          throw new Error("No shareable URL returned");
        }
      } catch {
        if (urlToShare) {
          await navigator.clipboard.writeText(urlToShare);
          setStatus("Link copied");
        } else {
          setStatus("Share failed");
        }
      }
    } catch (e) {
      console.error(e);
      setStatus("Share failed");
    }
  };

  elDown.onclick = async () => {
    try {
      const st = reelState.get(memoryId);
      const { reelId, previewData: pd } = st || {};
      if (!pd) return;

      if (reelId) {
        await downloadReelSavedApi({
          reelId,
          fileName: `${(pd.title || "smritikosha_reel").replace(/\s+/g, "_")}.mp4`,
        });
      } else {
        await downloadReelEphemeralApi({
          previewData: pd,
          title: pd.title,
        });
      }

      setStatus("Download started");
    } catch (e) {
      console.error(e);
      setStatus("Download failed");
    }
  };
}

// --------- Public mounts ----------

export function mountReelActionsForMemory(memoryId, previewData) {
  const card = document.querySelector(`[data-memory-id="${memoryId}"]`);
  if (!card) return;
  createReelActionsBar(card, memoryId, previewData);
}

export function mountReelActionsForReel(memoryId, previewData, containerEl) {
  if (!containerEl) return;
  createReelActionsBar(containerEl, memoryId, previewData);
}

export function unmountReelActionsForMemory(memoryId) {
  const card = document.querySelector(`[data-memory-id="${memoryId}"]`);
  card?.querySelector(".sk-reel-actions")?.remove();
  reelState.delete(memoryId);
}
