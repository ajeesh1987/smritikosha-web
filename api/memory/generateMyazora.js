// /api/memory/generateMyazora.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid imageUrl' });
    }

    const podUrl = process.env.MYAZORA_POD_URL;
    if (!podUrl) {
      console.error('❌ MYAZORA_POD_URL is not defined in environment variables.');
    }
    
    const response = await fetch(podUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl })
    });

    const result = await response.json();

    if (!response.ok || !result.image) {
      console.error('Myazora pod error:', result);
      return res.status(502).json({ error: 'Image generation failed', detail: result });
    }

    return res.status(200).json({ imageUrl: result.image });

  } catch (err) {
    console.error('🔥 Myazora API Error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message || err });
  }
}
