// src/memory/reelHandlers.js
import {
  saveReel,
  publishReel,
  downloadReelEphemeral,
  downloadReelSaved
} from './reelActions.js';

// assumes you already have memoryId and previewData from /api/memory/reel
let reelId = null;

export async function onSaveClick(memoryId, previewData) {
  try {
    reelId = await saveReel({
      memoryId,
      title: previewData.title,
      summary: previewData.summary,
      previewData
    });
    console.log('Saved reel:', reelId);
  } catch (err) {
    console.error('Save failed:', err);
  }
}

export async function onShareClick(memoryId, previewData) {
  try {
    if (!reelId) {
      reelId = await saveReel({
        memoryId,
        title: previewData.title,
        summary: previewData.summary,
        previewData
      });
    }
    const { viewUrl } = await publishReel({ reelId });

    if (navigator.share) {
      await navigator.share({ title: previewData.title, url: viewUrl });
    } else {
      await navigator.clipboard.writeText(viewUrl);
      alert('Link copied to clipboard');
    }
  } catch (err) {
    console.error('Share failed:', err);
  }
}

export async function onDownloadClick(previewData) {
  try {
    if (reelId) {
      await downloadReelSaved({ reelId });
    } else {
      await downloadReelEphemeral({
        previewData,
        title: previewData.title
      });
    }
  } catch (err) {
    console.error('Download failed:', err);
  }
}
