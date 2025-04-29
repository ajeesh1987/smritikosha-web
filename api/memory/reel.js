// /api/memory/reel.js

import { summarizeText } from "./summarizeText"; // Import the summarizeText function
import { getMemoryImages } from "./reel"; // Import the image fetcher

export async function handleReelRequest(req, res) {
  const { memoryIds } = req.body;

  if (!memoryIds || memoryIds.length === 0) {
    return res.status(400).json({ error: "No memory IDs provided." });
  }

  try {
    // Fetch images for the selected memories
    const images = await getMemoryImages(memoryIds);

    // Summarize text for each memory
    const summaries = await Promise.all(memoryIds.map(async (memoryId) => {
      const { title, memory_text, tags, locations } = await getMemoryDetails(memoryId); // Assuming this function exists to get memory details
      const summary = await summarizeText(title, memory_text, tags, locations);
      return { memoryId, summary };
    }));

    // Proceed with creating a reel from the images (this part will come later)
    return res.status(200).json({ summaries, images });
  } catch (error) {
    console.error("Error during summarization or image fetch:", error);
    return res.status(500).json({ error: "Failed to summarize or fetch images." });
  }
}
