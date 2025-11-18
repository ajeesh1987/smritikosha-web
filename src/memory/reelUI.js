// src/memory/reelUI.js

import { supabase } from "../../lib/supabaseClient.js";
import { exportReelToVideo } from "../..api/memory/reelExport.js";

// --------- API helpers ----------

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

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("saveReel error:", res.status, errBody);
    throw new Error("Save failed");
  }

  const { reelId } = await res.json();
  if (!reelId) throw new Error("Missing reelId");
  return reelId;
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
    }, 2500);
  };

  // SAVE → keep using backend so reels table is populated
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

  // SHARE → for MVP, share app link (no server render yet)
  elShare.onclick = async () => {
    try {
      const st = reelState.get(memoryId);
      const { previewData: pd } = st || {};

      const baseUrl = window.location.origin || "https://smritikosha.com";
      const shareUrl = baseUrl;
      const shareTitle = pd?.title || "My SmritiKosha Reel";
      const shareText = `I created a memory reel in SmritiKosha: ${shareTitle}`;

      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setStatus("Shared");
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setStatus("Link copied");
      } else {
        setStatus("Share not supported");
      }
    } catch (e) {
      console.error(e);
      setStatus("Share failed");
    }
  };

  // DOWNLOAD → browser-side export to video (canvas + MediaRecorder)
  elDown.onclick = async () => {
    try {
      const st = reelState.get(memoryId);
      const { previewData: pd } = st || {};
      if (!pd) return;

      setStatus("Exporting video...");
      await exportReelToVideo(
        pd,
        (pd.title || "smritikosha_reel").replace(/\s+/g, "_")
      );
      setStatus("Download started");
    } catch (e) {
      console.error("Browser export failed:", e);
      if (e?.message?.includes("not support")) {
        setStatus("Download not supported on this browser");
      } else {
        setStatus("Download failed");
      }
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
