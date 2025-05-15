// /api/memory/generateMyazora.js

import fetch from 'node-fetch';

const ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT = `https://api.runpod.ai/v2/${ENDPOINT_ID}/run`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid imageUrl' });
    }

    // Payload format expected by your RunPod FastAPI server
    const payload = {
      input: {
        image_url: imageUrl
      }
    };

    const rpResponse = await fetch(RUNPOD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNPOD_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const text = await rpResponse.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error('❌ Failed to parse RunPod response:', err);
      return res.status(502).json({ error: 'Invalid response from image generation API', detail: text });
    }

    if (!rpResponse.ok || !parsed.image) {
      return res.status(502).json({ error: 'Image generation failed', detail: parsed });
    }

    return res.status(200).json({ imageUrl: parsed.image });

  } catch (err) {
    console.error('🔥 Myazora API Error:', err);
    return res.status(500).json({
      error: 'Server error',
      detail: err.message || err
    });
  }
}
