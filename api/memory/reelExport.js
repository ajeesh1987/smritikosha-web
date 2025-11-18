// src/memory/reelExport.js

// Pick the best supported video mime type for this browser
function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;

  const candidates = [
    "video/mp4;codecs=h264",       // Safari / iOS
    "video/webm;codecs=vp9",       // Chrome / Edge / Firefox (high quality)
    "video/webm;codecs=vp8",
    "video/webm"
  ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function drawTitleCard(ctx, width, height, title, theme, mood) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";

  ctx.font = "bold 48px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(title || "My SmritiKosha Reel", width / 2, height / 2 - 30);

  ctx.font = "24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  const subtitle = [theme, mood].filter(Boolean).join(" • ");
  if (subtitle) {
    ctx.fillStyle = "#6B7280";
    ctx.fillText(subtitle, width / 2, height / 2 + 20);
  }
}

function drawFrame(ctx, width, height, img, caption) {
  // white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (img) {
    // cover with letterboxing
    const canvasRatio = width / height;
    const imgRatio = img.width / img.height;

    let drawWidth, drawHeight, dx, dy;
    if (imgRatio > canvasRatio) {
      // image is wider than canvas
      drawWidth = width;
      drawHeight = width / imgRatio;
      dx = 0;
      dy = (height - drawHeight) / 2;
    } else {
      // image is taller than canvas
      drawHeight = height;
      drawWidth = height * imgRatio;
      dx = (width - drawWidth) / 2;
      dy = 0;
    }
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  }

  if (caption) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, height - 140, width, 140);

    ctx.textAlign = "center";
    ctx.fillStyle = "#F9FAFB";
    ctx.font = "24px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(caption, width / 2, height - 70);
  }
}

/**
 * Browser-side export of a reel to a video file.
 * - Uses canvas + MediaRecorder
 * - Plays in real time while recording
 * - Triggers a download at the end
 *
 * @param {object} previewData - The reel data from /api/memory/reel
 * @param {string} [fileNameOverride] - Optional file name base (without extension)
 */
export async function exportReelToVideo(previewData, fileNameOverride) {
  if (typeof document === "undefined") {
    throw new Error("Document is not available");
  }

  const mimeType = pickMimeType();
  if (!mimeType) {
    throw new Error("This browser does not support video recording");
  }

  const { title, theme, mood, visualFlow } = previewData || {};
  if (!Array.isArray(visualFlow) || visualFlow.length === 0) {
    throw new Error("No frames to export");
  }

  // Canvas setup (vertical 9:16)
  const width = 1080;
  const height = 1920;
  const fps = 30;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType });

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const onStopPromise = new Promise((resolve, reject) => {
    recorder.onerror = (e) => reject(e.error || e.name || e);
    recorder.onstop = () => resolve();
  });

  recorder.start();

  try {
    // 1. Title card for ~2s
    drawTitleCard(ctx, width, height, title, theme, mood);
    await wait(2000);

    // 2. Preload all images
    const imgs = await Promise.all(
      visualFlow.map((block) => {
        return new Promise((resolve) => {
          if (!block.imageUrl) return resolve(null);
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = block.imageUrl;
        });
      })
    );

    // 3. For each frame: draw and hold for its duration
    for (let i = 0; i < visualFlow.length; i++) {
      const block = visualFlow[i];
      const img = imgs[i];
      const caption = block.caption || "";
      const durationMs = Math.max(1, block.duration || 3) * 1000;

      drawFrame(ctx, width, height, img, caption);
      await wait(durationMs);
    }
  } finally {
    recorder.stop();
    await onStopPromise;
  }

  const blob = new Blob(chunks, { type: mimeType });
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const safeBase =
    (fileNameOverride || title || "smritikosha_reel").replace(/\s+/g, "_") || "smritikosha_reel";
  const fileName = `${safeBase}.${ext}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
