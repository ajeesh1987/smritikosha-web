// /api/memory/generateReelData.js
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates the visual flow for a memory reel by letting AI determine how best to tell the story.
 * @param {string} memoryId 
 * @param {string} userId 
 * @param {object} supabase - Supabase client instance
 */
export async function getReelVisualFlow(memoryId, userId, supabase) {
  const { data: images, error } = await supabase
    .from('memory_images')
    .select('id, image_path, location, description, tags, capture_date')
    .eq('memory_id', memoryId)
    .eq('user_id', userId)
    .order('capture_date', { ascending: true });

  if (error) throw new Error('Failed to fetch memory images');
  if (!images || images.length === 0) return [];

  const formattedImages = images.map(img => ({
    id: img.id,
    url: supabase.storage.from('memory-images').getPublicUrl(img.image_path).data.publicUrl,
    location: img.location || '',
    description: img.description || '',
    tags: img.tags || '',
    date: img.capture_date || '',
  }));

  // Let AI decide how to present these images in a cinematic sequence
  const flowPrompt = `
You're a creative film director crafting a short, emotionally engaging memory reel from ${formattedImages.length} user-submitted photos.

Each image includes optional metadata: location, tags, description, and capture date.

Here’s your task:
- Analyze the photos and choose an expressive sequence (chronological or narrative-driven).
- Select up to 2 images (but zero is allowed) that deserve a Ghibli-style fantasy reimagining.
- Assign subtle transitions: fade, zoom, pan, map-travel, etc. Choose what fits emotionally.
- If this memory suggests travel (from locations or capture dates), include a map-travel moment.
- Add optional poetic/emotional captions.
- Decide how long each image should be shown (default 3.5s).
- Pick a mood (e.g. nostalgic, adventurous, tender) and a visual theme.

Respond ONLY with a valid JSON object in this format:
{
  "theme": "One or two word visual tone (e.g. Dreamy Voyage)",
  "mood": "emotional tone (e.g. Nostalgic)",
  "musicStyle": "instrumental | ambient | ghibli-piano | cinematic",
  "visualFlow": [
    {
      "imageUrl": "...",
      "caption": "Optional AI-generated text",
      "date": "",
      "location": "",
      "tags": ["..."],
      "duration": 4,
      "effect": "fade | zoom | ghibli | map-travel | pan | none"
    },
    ...
  ]
}

Here is the metadata for the photos:
${JSON.stringify(formattedImages, null, 2)}

Return ONLY the JSON object.`.trim();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: flowPrompt }],
    temperature: 0.9,
  });

  const raw = completion.choices[0].message.content.trim();

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.visualFlow || !Array.isArray(parsed.visualFlow)) {
      throw new Error("Missing or invalid visualFlow array");
    }
    return parsed; // ✅ this includes theme, mood, musicStyle, visualFlow
  } catch (err) {
    console.error('AI response not valid JSON:', raw);
    throw new Error('AI did not return valid JSON for reel content');
  }
  
}
