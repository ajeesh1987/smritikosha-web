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

  // Securely fetch signed URLs and format image metadata
  const imageMap = images.map(async img => {
    const { data, error: signError } = await supabase
      .storage
      .from('memory-images')
      .createSignedUrl(encodeURI(img.image_path), 3600);

    if (signError || !data?.signedUrl) {
      console.warn('Skipping image due to signing error:', img.image_path);
      return null;
    }

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

  const smartDuration = Math.max(1.8, Math.min(3, 60 / formattedImages.length));

  const flowPrompt = `
  You're a creative film director crafting a short, emotionally engaging memory reel from ${formattedImages.length} user-submitted photos.

  Each photo includes optional metadata: location, tags, description, and capture date.

  Your responsibilities:

  1. **Sequence Design**  
     - Analyze the images and choose an expressive visual sequence (chronological or narrative-driven).  
     - Include **every image** in the output.  
     - Assign an appropriate transition style to each (fade, zoom, pan, map-travel, etc).  
     - For each image, assign a 'duration' of approximately ${smartDuration.toFixed(1)} seconds.

  2. **Travel Awareness**  
     - If travel is evident (based on geolocations or capture dates), add at least one `map-travel` transition to illustrate motion.

  3. **Captioning (Optional)**  
     - Add poetic or emotional captions where it enhances the storytelling.

  4. **Mood and Style**  
     - Choose a single mood (e.g., nostalgic, adventurous, tranquil) and a matching visual theme (e.g., Dreamy Voyage, Whimsical Escape).

  5. **Ghibli-style Reimagination**  
     - Select up to **2 images** (or zero) that would benefit most from a stylized transformation into Studio Ghibli art.  
     - Optionally, decide if **an extra Ghibli-style interpreted frame** can be created and added to the reel to deepen the emotional arc.

     To evaluate and reimagine a Ghibli-style frame:
     - **7a. Analyze the Image**: Assess composition, palette, subjects.
     - **7b. Match Ghibli Traits**: Look for cues that align with Studio Ghibli’s aesthetic:  
       - Soft, vibrant colors  
       - Nature-rich settings  
       - Expressive characters with emotive eyes  
       - Dreamlike lighting and layered depth
     - **7c. Visualize the Transformation**: Imagine a Ghibli reinterpretation—how it would appear if hand-drawn in Ghibli style.
     - **7d. Add to Reel**: If it adds magic or emotional weight, insert the stylized image as a separate frame.

  Respond ONLY with a **valid JSON object** in this format:
  {
    "theme": "e.g. Dreamy Voyage",
    "mood": "e.g. Nostalgic",
    "musicStyle": "instrumental | ambient | ghibli-piano | cinematic",
    "visualFlow": [
      {
        "imageUrl": "...",
        "caption": "Optional",
        "date": "",
        "location": "",
        "tags": ["..."],
        "duration": ${smartDuration.toFixed(1)},
        "effect": "fade | zoom | pan | ghibli | map-travel | none"
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
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  const safeJson = raw.slice(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(safeJson);

    if (
      !parsed.visualFlow ||
      !Array.isArray(parsed.visualFlow) ||
      typeof parsed.theme !== 'string' ||
      typeof parsed.mood !== 'string' ||
      typeof parsed.musicStyle !== 'string'
    ) {
      throw new Error("Incomplete or invalid AI structure");
    }

    // Inject generated Ghibli-style images
    for (const frame of parsed.visualFlow) {
      if (frame.effect === 'ghibli' && !formattedImages.some(img => img.url === frame.imageUrl)) {
        const imgPrompt = `Studio Ghibli style illustration of: ${frame.caption || 'a poetic memory'}`;
        const result = await openai.images.generate({
          model: "dall-e-3",
          prompt: imgPrompt,
          n: 1,
          size: "1024x1024"
        });
        if (result?.data?.[0]?.url) frame.imageUrl = result.data[0].url;
      }
    }

    return parsed;
  } catch (err) {
    console.error('AI response not valid JSON:', raw);
    throw new Error('AI did not return valid JSON for reel content');
  }
}
