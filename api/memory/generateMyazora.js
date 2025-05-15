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

    const payload = {
      input: { image_url: imageUrl } // 👈 match the param your handler.py expects
    };

    const rpResponse = await fetch(RUNPOD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNPOD_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const text = await rpResponse.text(); // Read raw text first
    let json;

    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('❌ Failed to parse RunPod response:', e);
      console.error('Raw response text:', text);
      return res.status(502).json({ error: 'RunPod response not JSON', detail: text });
    }

    const base64 = json.image;
    if (!base64) {
      return res.status(502).json({ error: 'RunPod returned no image', detail: json });
    }

    return res.status(200).json({ imageUrl: base64 });

  } catch (err) {
    console.error('🔥 Myazora API Error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message || err });
  }
}
