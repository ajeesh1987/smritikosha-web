// /api/memory/summarize.js

import { OpenAI } from "openai"; // Assuming you use openai npm package
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, memory_text, tags, locations } = req.body;

  if (!memory_text || memory_text.length < 10) {
    return res.status(400).json({ error: "Memory text is too short or missing." });
  }

  try {
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

    return res.status(200).json({ summary });
  } catch (error) {
    console.error("Summarization error:", error);
    return res.status(500).json({ error: "Failed to summarize memory." });
  }
}
