// /api/memory/summarizeText.js

import { OpenAI } from "openai"; // Assuming you use openai npm package
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function summarizeText(title, memory_text, tags, locations) {
  if (!memory_text || memory_text.length < 10) {
    throw new Error("Memory text is too short or missing.");
  }

  const prompt = `
  Summarize the following memory entry in a short and emotionally engaging paragraph.

  Memory Title: ${title || "(No Title)"}

  Tags: ${tags && tags.length > 0 ? tags.join(", ") : "(No Tags)"}

  Locations: ${locations && locations.length > 0 ? locations.join(", ") : "(No Locations)"}

  Memory Text:
  ${memory_text}

  Summarize it in less than 100 words, focusing on emotions and key experiences.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Summarization error:", error);
    throw new Error("Failed to summarize memory.");
  }
}
