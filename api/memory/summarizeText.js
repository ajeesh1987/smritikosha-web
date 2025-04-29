import { OpenAI } from "openai";
import { getMemoryDetails } from './utils'; // Utility to fetch memory details
import { getMemoryImages } from './reel'; // Utility to fetch images for a reel

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { memoryIds } = req.body;

  if (!memoryIds || memoryIds.length === 0) {
    return res.status(400).json({ error: "No memory IDs provided." });
  }

  try {
    let summaries = [];
    let images = [];

    for (const memoryId of memoryIds) {
      // Fetch memory details (title, description, tags)
      const memoryDetails = await getMemoryDetails(memoryId);
      
      // Handle text summarization
      const textSummary = await summarizeText(memoryDetails);

      // Add summary to the result
      summaries.push({ memoryId, summary: textSummary });

      // Handle images and reel creation (if required)
      if (req.body.generateReel) {
        const memoryImages = await getMemoryImages(memoryId); // Fetch images for the reel
        images.push({ memoryId, images: memoryImages });
      }
    }

    return res.status(200).json({
      summaries,
      images: images.length ? images : undefined, // Only include images if the reel was requested
    });

  } catch (error) {
    console.error("Summarization error:", error);
    return res.status(500).json({ error: "Failed to process the request." });
  }
}

// Function to summarize text
async function summarizeText({ title, description, tags, memoryText }) {
  const prompt = `
Summarize the following memory entry in a short and emotionally engaging paragraph.

Memory Title: ${title || "(No Title)"}
Tags: ${tags && tags.length > 0 ? tags.join(", ") : "(No Tags)"}
Description: ${description || "(No Description)"}
Memory Text: ${memoryText}

Summarize it in less than 100 words, focusing on emotions and key experiences.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  });

  return response.choices[0].message.content.trim();
}
