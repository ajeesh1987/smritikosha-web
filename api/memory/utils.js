import { supabase } from '../../lib/supabaseClient.js';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Fetches memory details along with related image descriptions, tags, and locations.
 */
export async function getMemoryDetails(memoryId, supabase) {
  console.log('🔍 Fetching memory for ID:', memoryId);

  // 1️⃣ Get the main memory entry
  const { data: memory, error: memError } = await supabase
    .from('memories')
    .select('id, title, description, tags, location')
    .eq('id', memoryId)
    .maybeSingle();

  if (memError) {
    throw new Error(`Failed to fetch memory details: ${memError.message}`);
  }

  if (!memory) {
    throw new Error(`No memory found for ID: ${memoryId}`);
  }

  // 2️⃣ Get related image details (description, tags, location)
  const { data: images, error: imgError } = await supabase
    .from('memory_images')
    .select('description, tags, location')
    .eq('memory_id', memoryId);

  if (imgError) {
    console.warn('⚠️ Could not fetch image details:', imgError.message);
  }

  // 3️⃣ Combine all image info into one descriptive block
  const imageDetails = (images || [])
    .map((img, i) => {
      const parts = [];
      if (img.description) parts.push(`Image ${i + 1}: ${img.description}`);
      if (img.tags) parts.push(`Tags: ${img.tags}`);
      if (img.location) parts.push(`Location: ${img.location}`);
      return parts.join('. ');
    })
    .filter(Boolean)
    .join('\n');

  // 4️⃣ Return merged object
  return {
    ...memory,
    imageDetails,
  };
}

/**
 * Summarizes the combined memory and image data using OpenAI.
 */
export async function summarizeText(title, description, tags, location, imageDetails = '') {
  // Combine textual context from both memory and its images
  const combinedDescription = [description, imageDetails].filter(Boolean).join('\n\n');

  const prompt = `
Summarize the following memory in less than 100 words.
Focus on emotions, highlights, and any sense of place or atmosphere.

Memory Title: ${title || "(No Title)"}
Tags: ${tags || "No tags provided."}
Location: ${location || "No location specified."}

Memory & Image Details:
${combinedDescription || "No description or image details provided."}

Write the summary as if narrating a personal, heartfelt recollection.
  `.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}
