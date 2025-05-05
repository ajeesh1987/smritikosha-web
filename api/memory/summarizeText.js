import { OpenAI } from "openai";
import { supabase } from 'lib/supabaseClient';
import { getMemoryDetails } from 'api/memory/utils';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { memoryId } = req.body;
  
  // Check for authentication token in the request
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from header

  if (!token) {
    return res.status(401).json({ error: "Unauthorized, no token provided." });
  }

  // Verify the token and get user data
  const { data: user, error: authError } = await supabase.auth.api.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized, invalid token." });
  }

  // Proceed with fetching memory details and summarizing
  if (!memoryId) {
    return res.status(400).json({ error: "Memory ID is required." });
  }

  try {
    const memoryDetails = await getMemoryDetails(memoryId);
    const { title, description, tags, location } = memoryDetails;

    // Handle empty fields and provide default values if necessary
    const finalDescription = description || "No description provided.";
    const finalTags = tags && tags.length > 0 ? tags.join(", ") : "No tags provided.";
    const finalLocation = location || "No location specified.";

    const prompt = `
Summarize the following memory entry in a short and emotionally engaging paragraph.

Memory Title: ${title || "(No Title)"}

Tags: ${finalTags}

Locations: ${finalLocation}

Memory Text:
${finalDescription}

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
