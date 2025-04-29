// /api/memory/summarizeText.js

import { OpenAI } from "openai"; // Assuming you use openai npm package
import { getMemoryDetails } from './utils'; // Use a relative import
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { memoryId } = req.body;

  if (!memoryId) {
    return res.status(400).json({ error: "Memory ID is required." });
  }

  try {
    const memoryDetails = await getMemoryDetails(memoryId);
    const { title, description, tags, location } = memoryDetails;

    const prompt = `
Summarize the following memory entry in a short and emotionally engaging paragraph.

Memory Title: ${title || "(No Title)"}

Tags: ${tags && tags.length > 0 ? tags.join(", ") : "(No Tags)"}

Locations: ${location || "(No Locations)"}

Memory Text:
${description}

Summarize it in less than 100 words, focusing on emotions and key experiences.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const summary = response.choices[0].message.content.trim();

    return res.status(200).json({ summary });
  } catch (error) {
    console.error("Summarization error:", error);
    return res.status(500).json({ error: "Failed to summarize memory." });
  }
}
