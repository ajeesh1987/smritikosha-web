import { OpenAI } from "openai";
import { getMemoryDetails } from './utils.js';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { memoryId } = req.body;

  // ✅ Extract token from Authorization header
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: no token provided." });
  }

  // ✅ Create a server-side Supabase client using token
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // ✅ Verify the user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized: invalid token." });
  }

  if (!memoryId) {
    return res.status(400).json({ error: "Memory ID is required." });
  }

  try {
    const memoryDetails = await getMemoryDetails(memoryId);
    const { title, description, tags, location } = memoryDetails;

    const finalDescription = description || "No description provided.";
    const finalTags = tags && tags.length > 0 ? tags.join(", ") : "No tags provided.";
    const finalLocation = location || "No location specified.";

    const prompt = `
Summarize the following memory entry in a short and emotionally engaging paragraph.

Memory Title: ${title || "(No Title)"}

Tags: ${finalTags}

Location: ${finalLocation}

Memory Text:
${finalDescription}

Summarize it in less than 100 words, focusing on emotions and key experiences.
    `.trim();

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
