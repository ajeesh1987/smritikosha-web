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
    .eq('user_id', userId);

  if (error) throw new Error('Failed to fetch memory images');

  const imageMap = images.map(async img => {
    const { data, error: signError } = await supabase
      .storage
      .from('memory-images')
      .createSignedUrl(encodeURI(img.image_path), 3600);

    if (signError || !data?.signedUrl) return null;

    return {
      id: img.id,
      url: data.signedUrl,
      location: img.location || '',
      description: img.description || '',
      tags: img.tags || '',
      date: img.capture_date || '',
    };
  });

  const formattedImages = (await Promise.all(imageMap)).filter(Boolean);
  // ...
}

