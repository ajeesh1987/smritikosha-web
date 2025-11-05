// lib/reelPath.js
export function reelPaths(userId, reelId) {
  const base = `${userId}/${reelId}`;
  return {
    privateVideo: `${base}/video.mp4`,
    privatePoster: `${base}/poster.jpg`,
    publicVideo: `${base}/video.mp4`,
    publicPoster: `${base}/poster.jpg`
  };
}

export function makeSlug() {
  return Math.random().toString(36).slice(2, 9);
}
