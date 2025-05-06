import { supabase } from '../../lib/supabaseClient.js'; // Adjusted the relative path
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getMemoryDetails(memoryId, supabase) {
  console.log('🔍 Fetching memory for ID:', memoryId);

  const { data, error } = await supabase
    .from('memories')
    .select('id, title, description, tags, location')
    .eq('id', memoryId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch memory details: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No memory found for ID: ${memoryId}`);
  }

  return data;
}

export async function summarizeText(title, description, tags, location) {
  const prompt = `
Summarize the following memory entry in a short and emotionally engaging paragraph.

Memory Title: ${title || "(No Title)"}

Tags: ${tags || "No tags provided."}

Location: ${location || "No location specified."}

Memory Text:
${description || "No description provided."}

Summarize it in less than 100 words, focusing on emotions and key experiences.
  `.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}
