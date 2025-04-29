// /api/memory/summarize.js

import { summarizeText } from "./summarizeText.js"; // Import the summarizeText function
import { getMemoryImages } from "./reel.js"; // Import the image fetcher

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, memory_text, tags, locations } = req.body;

  try {
    // Summarize text
    const summary = await summarizeText(title, memory_text, tags, locations);

    return res.status(200).json({ summary });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
