// /api/yearInReview/generate.js
//
// Generates a Year in Review reel for the authenticated user.
// Fetches all memories + images from the target year, applies monthly
// bucketing (max 2 images per month, max 24 total), then asks GPT-4o
// to produce a visualFlow in the same shape as /api/memory/reel.
//
// POST /api/yearInReview/generate
// Body (optional): { year: 2025 }   — defaults to current year - 1
// Returns: previewData  (same shape playReel() and exportReelToVideo() expect)

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_FRAMES     = 24;   // hard cap — keeps export under ~65s
const MAX_PER_MONTH  = 2;    // monthly bucket size

// ─── Scoring heuristic ───────────────────────────────────────────────────────
// Images the user annotated are more meaningful than bare uploads.
function scoreImage(img) {
  let score = 0;
  if (img.description && img.description.trim()) score += 2;
  if (img.location    && img.location.trim())    score += 1;
  return score;
}

// ─── Monthly bucketing ───────────────────────────────────────────────────────
// Groups images by month (0-indexed), sorts each bucket by score desc,
// returns up to MAX_PER_MONTH per month, capped at MAX_FRAMES total.
function bucketByMonth(images) {
  const byMonth = Array.from({ length: 12 }, () => []);

  for (const img of images) {
    const month = new Date(img.effectiveDate).getMonth(); // 0 = Jan
    byMonth[month].push(img);
  }

  const selected = [];
  for (const bucket of byMonth) {
    if (bucket.length === 0) continue;
    bucket.sort((a, b) => scoreImage(b) - scoreImage(a));
    selected.push(...bucket.slice(0, MAX_PER_MONTH));
    if (selected.length >= MAX_FRAMES) break;
  }

  return selected.slice(0, MAX_FRAMES);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(400).json({ error: 'Missing auth token' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Determine target year and whether to prepend a Happy New Year title card
  const requestedYear = req.body?.year;
  const includeHny    = req.body?.hny === true;
  const targetYear = Number.isInteger(requestedYear)
    ? requestedYear
    : new Date().getFullYear() - 1;

  const yearStart = `${targetYear}-01-01`;
  const yearEnd   = `${targetYear}-12-31`;

  try {
    // ── 1. Fetch all memories for this user ──────────────────────────────────
    const { data: memories, error: memErr } = await supabase
      .from('memories')
      .select('id, title, created_at')
      .eq('user_id', user.id);

    if (memErr) throw new Error(`Failed to fetch memories: ${memErr.message}`);
    if (!memories || memories.length === 0) {
      return res.status(200).json({ empty: true, reason: 'no_memories' });
    }

    const memoryIds     = memories.map(m => m.id);
    const memoryDateMap = Object.fromEntries(memories.map(m => [m.id, m.created_at]));

    // ── 2. Fetch all images for those memories ───────────────────────────────
    const { data: allImages, error: imgErr } = await supabase
      .from('memory_images')
      .select('id, memory_id, image_path, description, tags, location, capture_date')
      .in('memory_id', memoryIds);

    if (imgErr) throw new Error(`Failed to fetch images: ${imgErr.message}`);
    if (!allImages || allImages.length === 0) {
      return res.status(200).json({ empty: true, reason: 'no_images' });
    }

    // ── 3. Attach effective date and filter to target year ───────────────────
    const yearImages = allImages
      .map(img => ({
        ...img,
        // prefer EXIF capture_date; fall back to memory's created_at
        effectiveDate: img.capture_date || memoryDateMap[img.memory_id] || null
      }))
      .filter(img => {
        if (!img.effectiveDate) return false;
        const d = img.effectiveDate.slice(0, 10); // 'YYYY-MM-DD'
        return d >= yearStart && d <= yearEnd;
      });

    if (yearImages.length === 0) {
      return res.status(200).json({ empty: true, reason: 'no_images_in_year' });
    }

    // ── 4. Sort chronologically before bucketing so per-month order is right ─
    yearImages.sort((a, b) =>
      new Date(a.effectiveDate) - new Date(b.effectiveDate)
    );

    // ── 5. Monthly bucketing → max 24 frames ─────────────────────────────────
    const selected = bucketByMonth(yearImages);

    // ── 6. Sign URLs for selected images ─────────────────────────────────────
    const withUrls = (
      await Promise.all(
        selected.map(async img => {
          const { data, error: signErr } = await supabase.storage
            .from('memory-images')
            .createSignedUrl(encodeURI(img.image_path), 3600);

          if (signErr || !data?.signedUrl) {
            console.warn('Skipping image, sign error:', img.image_path);
            return null;
          }
          return { ...img, signedUrl: data.signedUrl };
        })
      )
    ).filter(Boolean);

    if (withUrls.length === 0) {
      return res.status(200).json({ empty: true, reason: 'no_signable_images' });
    }

    // ── 7. Build AI prompt ────────────────────────────────────────────────────
    const smartDuration = Math.max(1.8, Math.min(3, 60 / withUrls.length));

    const imageList = withUrls.map((img, i) => {
      const tags = Array.isArray(img.tags)
        ? img.tags.join(', ')
        : (typeof img.tags === 'string' ? img.tags : '');
      return `[Image ${i + 1}]
- URL: ${img.signedUrl}
- Date: ${img.effectiveDate?.slice(0, 10) || ''}
- Location: ${img.location || ''}
- Description: ${img.description || ''}
- Tags: ${tags}`;
    }).join('\n\n');

    const prompt = `
You are a thoughtful documentary editor creating a "Year in Review" highlight reel for ${targetYear}.

You have ${withUrls.length} photos drawn from across the year, already curated (max 2 per month).

Your responsibilities:

1. Sequence
   - Keep the photos in roughly chronological order (Jan → Dec).
   - Include every photo — do not drop any.
   - Set duration to approximately ${smartDuration.toFixed(1)} seconds per frame.

2. Transitions
   - Assign one of: fade, zoom, pan, none.
   - Do NOT use "ghibli" or "map-travel" transitions.

3. Captions
   - Write short, warm captions that feel like a personal journal entry.
   - Include the month name when it adds context (e.g. "March in Kyoto").

4. Mood and Theme
   - Choose one mood (e.g. Grateful, Nostalgic, Joyful) and one theme (e.g. A Year Well Lived).

${includeHny ? `5. Opening frame
   - The very first frame MUST be a title card; represent it as the first entry in visualFlow with:
     imageUrl: ""  (empty — the player renders it as a text card)
     caption: "Happy New Year! Here's your ${targetYear} in SmritiKosha."` : `5. Opening frame
   - Do NOT add any title card or opening frame. Start directly with the first photo.`}

Respond ONLY with a valid JSON object:
{
  "theme": "string",
  "mood": "string",
  "musicStyle": "instrumental | ambient | cinematic",
  "visualFlow": [
    {
      "imageUrl": "string",
      "caption": "string or empty",
      "date": "string or empty",
      "location": "string or empty",
      "tags": ["array"],
      "duration": ${smartDuration.toFixed(1)},
      "effect": "fade | zoom | pan | none"
    }
  ]
}

Photos:
${imageList}
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('GPT-4o returned invalid JSON:', raw);
      throw new Error('AI did not return valid JSON');
    }

    if (
      !parsed ||
      typeof parsed.theme !== 'string' ||
      typeof parsed.mood !== 'string' ||
      !Array.isArray(parsed.visualFlow)
    ) {
      throw new Error('Incomplete AI response structure');
    }

    // Normalise durations and tags
    parsed.visualFlow = parsed.visualFlow.map(f => ({
      ...f,
      duration: typeof f.duration === 'number' ? f.duration : smartDuration,
      tags: Array.isArray(f.tags)
        ? f.tags
        : (typeof f.tags === 'string' ? f.tags.split(/[, ]+/).filter(Boolean) : [])
    }));

    // ── 8. Return previewData in the same shape playReel() expects ────────────
    return res.status(200).json({
      reel_type: 'year_in_review',
      year: targetYear,
      title: `${targetYear} — Your Year in SmritiKosha`,
      summary: `A look back at your memories from ${targetYear}.`,
      theme: parsed.theme,
      mood: parsed.mood,
      musicStyle: parsed.musicStyle || 'ambient',
      visualFlow: parsed.visualFlow,
      memoryTags: []
    });
  } catch (err) {
    console.error('yearInReview/generate error:', err);
    return res.status(500).json({ error: 'Failed to generate Year in Review reel.' });
  }
}
