// generating reel data
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

  if (error) {
    console.error('Supabase fetch error:', error);
    throw new Error('Failed to fetch memory images');
  }

  if (!Array.isArray(images) || images.length === 0) {
    return {
      theme: 'Simple Memory',
      mood: 'Reflective',
      musicStyle: 'ambient',
      visualFlow: []
    };
  }

  const formattedImages = (
    await Promise.all(
      images.map(async (img) => {
        const { data, error: signError } = await supabase.storage
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
          tags: Array.isArray(img.tags)
            ? img.tags
            : (typeof img.tags === 'string' ? img.tags.split(/[, ]+/).filter(Boolean) : []),
          date: img.capture_date || ''
        };
      })
    )
  ).filter(Boolean);

  const smartDuration = Math.max(1.8, Math.min(3, 60 / Math.max(1, formattedImages.length)));

  const flowPrompt = `
You're a creative film director crafting a short, emotionally engaging memory reel from ${formattedImages.length} user-submitted photos.

Each photo includes optional metadata: location, tags, description, and capture date.

Your responsibilities:

1. Sequence Design
- Analyze the images and choose an expressive visual sequence. Include every image in the output.
- Assign a transition to each frame: fade, zoom, pan, ghibli, map-travel, or none.
- Set duration to approximately ${smartDuration.toFixed(1)} seconds for each frame.

2. Travel Awareness
- If travel is evident, add at least one map-travel transition.

3. Captioning (Optional)
- Add short captions where it enhances the story.

4. Mood and Style
- Choose one mood and one theme.

5. Ghibli-style Reimagination
- Select up to 2 images (or zero) that would benefit from ghibli effect.
- Optionally include a single extra interpreted ghibli frame via "ghibliEnhancedFrame".

Respond ONLY with a valid JSON object with this shape:
{
  "theme": "string",
  "mood": "string",
  "musicStyle": "instrumental | ambient | ghibli-piano | cinematic",
  "visualFlow": [
    {
      "imageUrl": "string",
      "caption": "string or empty",
      "date": "string or empty",
      "location": "string or empty",
      "tags": ["array of strings"],
      "duration": ${smartDuration.toFixed(1)},
      "effect": "fade | zoom | pan | ghibli | map-travel | none"
    }
  ],
  "ghibliEnhancedFrame": {
    "prompt": "string"
  }
}

Here is the metadata for the photos:
${formattedImages.map((img, i) => `
[Image ${i + 1}]
- URL: ${img.url}
- Location: ${img.location}
- Description: ${img.description}
- Tags: ${Array.isArray(img.tags) ? img.tags.join(', ') : ''}
- Date: ${img.date}
`).join('\n')}

Return ONLY the JSON object.
`.trim();

  // Ask for strict JSON to avoid regex parsing
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: flowPrompt }],
    temperature: 0.9,
    response_format: { type: 'json_object' }
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() || '';

  let parsed;
  try {
    parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed.theme !== 'string' ||
      typeof parsed.mood !== 'string' ||
      typeof parsed.musicStyle !== 'string' ||
      !Array.isArray(parsed.visualFlow)
    ) {
      throw new Error('Incomplete or invalid AI structure');
    }

    // Enforce max 2 ghibli frames even if the model flags more
    let ghibliBudget = 2;

    await Promise.all(
      parsed.visualFlow.map(async (frame) => {
        if (frame.effect === 'ghibli' && ghibliBudget > 0) {
          try {
            const imgPrompt =
              `Studio Ghibli style illustration of: ${frame.caption || `a poetic moment at ${frame.location || 'a beautiful place'}`}`;

            const result = await openai.images.generate({
              model: 'dall-e-3',
              prompt: imgPrompt,
              n: 1,
              size: '1024x1024'
            });

            if (result?.data?.[0]?.url) {
              frame.imageUrl = result.data[0].url;
              ghibliBudget -= 1;
            }
          } catch (genErr) {
            console.warn('Failed to generate Ghibli-style image:', genErr.message);
          }
        }
      })
    );

    if (parsed.ghibliEnhancedFrame?.prompt && ghibliBudget > 0) {
      try {
        const result = await openai.images.generate({
          model: 'dall-e-3',
          prompt: parsed.ghibliEnhancedFrame.prompt,
          n: 1,
          size: '1024x1024'
        });

        if (result?.data?.[0]?.url) {
          parsed.ghibliEnhancedFrame.imageUrl = result.data[0].url;
          ghibliBudget -= 1;
        }
      } catch (genErr) {
        console.warn('Failed to generate extra Ghibli frame:', genErr.message);
      }
    }

    // Ensure every frame has duration and tags in array form
    parsed.visualFlow = parsed.visualFlow.map((f) => ({
      ...f,
      duration: typeof f.duration === 'number' ? f.duration : smartDuration,
      tags: Array.isArray(f.tags)
        ? f.tags
        : (typeof f.tags === 'string' ? f.tags.split(/[, ]+/).filter(Boolean) : [])
    }));

    return parsed;
  } catch (err) {
    console.error('JSON parse failed:', err.message);
    console.error('RAW returned:', raw);
    throw new Error('AI did not return valid JSON for reel content');
  }
}
