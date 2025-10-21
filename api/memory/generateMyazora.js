// /api/memory/generateMyazora.js
import fetch from 'node-fetch';
import { URL } from 'url';

const RUNPOD_ENDPOINT = process.env.MYAZORA_POD_URL;

function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      imageUrl,
      // Optional overrides from client. Safe defaults below.
      strength = 0.28,       // lower = more faithful to original
      steps = 28,
      cfg = 4.5,
      sampler = 'DPM++ 2M Karras',
      seed = -1,             // -1 or undefined lets backend pick random
      loraName = 'myazora-ghibli.safetensors',
      loraWeight = 0.75,
      prompt =
        'Studio Ghibli inspired, soft colors, gentle lighting, clean line art, natural background, cinematic framing',
      negativePrompt =
        'blurry, deformed, extra fingers, extra limbs, low quality, distorted face, heavy stylization, off-model'
    } = req.body || {};

    if (!imageUrl || typeof imageUrl !== 'string' || !isValidHttpUrl(imageUrl)) {
      return res.status(400).json({ error: 'Missing or invalid imageUrl' });
    }

    if (!RUNPOD_ENDPOINT) {
      return res.status(500).json({ error: 'Server config error: MYAZORA_POD_URL missing' });
    }

    // 1) Fetch the source image and inline it as base64 to avoid CORS and to make
    // sure the pod actually runs img2img with this exact pixels.
    const imgResp = await fetch(imageUrl, { timeout: 20_000 });
    if (!imgResp.ok) {
      return res
        .status(502)
        .json({ error: `Could not fetch source image. Status ${imgResp.status}` });
    }
    const imgBuf = await imgResp.arrayBuffer();
    const base64Image = Buffer.from(imgBuf).toString('base64');
    // Try to infer a sensible mime. Default to jpeg if unknown.
    const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    // 2) Build a clear img2img request. Most RunPod SD servers accept a shape like this.
    // If your pod uses a different schema, adjust the "input" block names to match.
    const payload = {
      input: {
        mode: 'img2img',
        image: dataUrl,
        prompt,
        negative_prompt: negativePrompt,
        strength,
        steps,
        cfg_scale: cfg,
        sampler_name: sampler,
        seed,
        width: undefined,   // let backend keep original or model default
        height: undefined,
        // LoRA config. Many pods accept either an array or a single object.
        loras: [
          { name: loraName, weight: loraWeight }
        ]
      }
    };

    const rpResponse = await fetch(RUNPOD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 120_000
    });

    const text = await rpResponse.text();

    if (!text || text.trim() === '') {
      console.error(`Empty response from RunPod. Status: ${rpResponse.status}`);
      return res.status(502).json({
        error: 'Empty response from RunPod',
        status: rpResponse.status
      });
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse RunPod response:', e);
      console.error('Raw response text:', text);
      return res.status(502).json({
        error: 'RunPod response was not valid JSON',
        detail: text
      });
    }

    // Common patterns: imageBase64, image, output[0].image, output[0].base64
    let base64 =
      json.imageBase64 ||
      json.image ||
      (Array.isArray(json.output) && (json.output[0]?.image || json.output[0]?.base64)) ||
      null;

    if (!base64) {
      console.error('No image returned in JSON:', json);
      return res.status(502).json({ error: 'RunPod returned no image', detail: json });
    }

    // Normalize to a data URL so the front end can render directly in an <img>.
    if (!base64.startsWith('data:')) {
      base64 = `data:image/png;base64,${base64}`;
    }

    return res.status(200).json({ imageUrl: base64 });
  } catch (err) {
    console.error('Myazora API Error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message || String(err) });
  }
}
