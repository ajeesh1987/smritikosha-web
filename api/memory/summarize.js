import { OpenAI } from "openai"; // Assuming you use openai npm package
import { getMemoryImages } from './reel.js'; // Import the image fetcher

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleSummarizeRequest(req, res) {
  const { memoryIds, memory_text, title, tags, locations } = req.body;

  if (!memoryIds || memoryIds.length === 0) {
    return res.status(400).json({ error: "Memory IDs are required." });
  }

  if (!memory_text || memory_text.length < 10) {
    return res.status(400).json({ error: "Memory text is too short or missing." });
  }

  try {
    // Fetch images for the provided memory IDs
    const images = [];
    for (let memoryId of memoryIds) {
      const memoryImages = await getMemoryImages(memoryId);
      images.push(...memoryImages);
    }

    // Summarize the text using OpenAI
    const prompt = `
Summarize the following memory entry in a short and emotionally engaging paragraph.

Memory Title: ${title || "(No Title)"}

Tags: ${tags && tags.length > 0 ? tags.join(", ") : "(No Tags)"}

Locations: ${locations && locations.length > 0 ? locations.join(", ") : "(No Locations)"}

Memory Text:
${memory_text}

Summarize it in less than 100 words, focusing on emotions and key experiences.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const summary = response.choices[0].message.content.trim();

    // Return the summary and images
    return res.status(200).json({
      summary,
      images,
    });
  } catch (error) {
    console.error("Summarization error:", error);
    return res.status(500).json({ error: "Failed to summarize memory." });
  }
}

// Export the function as default
export default handleSummarizeRequest;
