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

    // Simulate processing delay (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock Ghibli-style image
    return res.status(200).json({
      imageUrl: 'https://cdn.pixabay.com/photo/2020/08/04/11/44/castle-5463516_1280.jpg'
    });

  } catch (err) {
    console.error('🔥 Myazora Mock Error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message || err });
  }
}
