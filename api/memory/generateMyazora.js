// /api/memory/generateMyazora.js
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLE_PROMPTS = {
  ghibli:      'Studio Ghibli hand-drawn anime illustration, soft watercolour tones, lush painterly details, Miyazaki style',
  watercolor:  'delicate watercolour painting, flowing washes of colour, soft edges, paper texture, artistic',
  oilpainting: 'classic oil painting, rich impasto texture, dramatic lighting, museum-quality fine art',
  vintage:     'vintage 35mm film photograph, warm grain, faded Kodachrome tones, nostalgic and cinematic',
  sketch:      'detailed pencil sketch, cross-hatching, graphite shading, hand-drawn illustration on white paper',
  dreamy:      'dreamy pastel digital art, soft bokeh, muted lavender and rose tones, ethereal and romantic',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageUrl, style = 'ghibli' } = req.body;

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid imageUrl' });
  }

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.ghibli;

  try {
    // Step 1: describe the image with vision so the prompt is grounded in the actual photo
    const visionRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in 2-3 sentences focusing on the scene, subjects, setting, mood, and any notable colours or lighting. Be specific and visual.',
            },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 150,
    });

    const description = visionRes.choices[0].message.content.trim();

    // Step 2: generate reimagined image with DALL-E 3
    const imageRes = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `${stylePrompt}. Scene: ${description}. Do not include any text or watermarks.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const generatedUrl = imageRes.data?.[0]?.url;
    if (!generatedUrl) {
      return res.status(502).json({ error: 'DALL-E returned no image' });
    }

    return res.status(200).json({ imageUrl: generatedUrl });

  } catch (err) {
    console.error('Myazora API error:', err);
    return res.status(500).json({ error: 'Image generation failed', detail: err.message });
  }
}
