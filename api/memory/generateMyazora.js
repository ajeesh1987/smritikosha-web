// /api/memory/generateGhibli.js
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid imageUrl' });
    }

    const prompt = `Studio Ghibli style illustration of a poetic moment captured in this image: ${imageUrl}. 
Warm tones, soft lighting, nature-inspired, detailed background — inspired by Hayao Miyazaki's visual storytelling.`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
    });

    const resultUrl = response?.data?.[0]?.url;

    if (!resultUrl) {
      console.error('OpenAI returned no image URL:', response);
      return res.status(502).json({ error: 'OpenAI image generation returned no result' });
    }

    return res.status(200).json({ imageUrl: resultUrl });

  } catch (err) {
    const isOpenAIError = err?.status || err?.response;
    const details = isOpenAIError
      ? (err.response?.data || err.message || 'OpenAI error')
      : (err.message || 'Unknown server error');

    console.error('🔥 Ghibli API Error:', details);

    return res.status(500).json({
      error: 'Server error',
      source: isOpenAIError ? 'openai' : 'internal',
      detail: details,
    });
  }
}
