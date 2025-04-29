// /api/memory/reel.js
import { OpenAI } from "openai"; 
import { getMemoryImages } from './reel.js'; // Import image-fetching function from reel.js
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getMemoryTextSummary(title, memory_text, tags, locations) {
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
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  });

  const summary = response.choices[0].message.content.trim();
  return summary;
}

async function handleReelRequest(req, res) {
  const { memoryIds } = req.body;

  if (!memoryIds || memoryIds.length === 0) {
    return res.status(400).json({ error: "Memory IDs are required." });
  }

  try {
    const memoriesData = [];

    // Loop over memory IDs and fetch relevant data
    for (const memoryId of memoryIds) {
      // Fetch memory-related data and images (you should have a function to get memory details)
      const memoryDetails = await getMemoryDetails(memoryId); // Implement getMemoryDetails to fetch memory data from DB
      const images = await getMemoryImages(memoryId); // Fetch images for each memory

      // Summarize the memory text
      const summary = await getMemoryTextSummary(
        memoryDetails.title,
        memoryDetails.memory_text,
        memoryDetails.tags,
        memoryDetails.locations
      );

      memoriesData.push({ summary, images });
    }

    // Combine everything into a response
    return res.status(200).json({ memoriesData });
  } catch (error) {
    console.error('Error during summarization or image fetch:', error);
    return res.status(500).json({ error: 'Failed to summarize or fetch images.' });
  }
}

export default handleReelRequest;
