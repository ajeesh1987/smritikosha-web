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
      input: {
        imageUrl
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

    const rpResult = await rpResponse.json();

    if (!rpResponse.ok || !rpResult.output?.imageUrl) {
      console.error('RunPod generation failed:', rpResult);
      return res.status(502).json({ error: 'Image generation failed', detail: rpResult });
    }

    return res.status(200).json({ imageUrl: rpResult.output.imageUrl });

  } catch (err) {
    console.error('🔥 Myazora API Error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message || err });
  }
}
