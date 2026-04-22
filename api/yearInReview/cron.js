// /api/yearInReview/cron.js
//
// Vercel cron job — fires midnight UTC on January 1st (schedule: "0 0 1 1 *").
//
// What it does:
//   1. Verifies the request is from Vercel (CRON_SECRET header check)
//   2. Finds every user who has at least one memory or image from the previous year
//   3. Upserts a year_in_review row (pending=true) for each — no AI, no generation
//
// The actual reel is generated client-side on first open (Phase 6).
// This job intentionally stays lightweight to fit inside Vercel's 10s timeout.
//
// Required env vars:
//   CRON_SECRET          — set in Vercel dashboard, matched against Authorization header
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY — service role bypasses RLS so we can read all users

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── 1. Verify Vercel cron secret ────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET env var is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── 2. Service-role client (bypasses RLS) ───────────────────────────────────
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const targetYear = new Date().getFullYear() - 1;
  const yearStart  = `${targetYear}-01-01`;
  const yearEnd    = `${targetYear}-12-31`;

  try {
    // ── 3. Find users who have memories created in the target year ─────────────
    //    Using memories.created_at as the proxy — fast, no join needed.
    //    A user with zero memories last year gets no YiR row (nothing to show).
    const { data: rows, error: memErr } = await supabase
      .from('memories')
      .select('user_id')
      .gte('created_at', yearStart)
      .lte('created_at', yearEnd);

    if (memErr) {
      console.error('Failed to query memories:', memErr.message);
      return res.status(500).json({ error: 'DB query failed' });
    }

    if (!rows || rows.length === 0) {
      console.log(`No memories found for ${targetYear} — nothing to do.`);
      return res.status(200).json({ enrolled: 0, year: targetYear });
    }

    // Deduplicate user IDs
    const userIds = [...new Set(rows.map(r => r.user_id))];

    // ── 4. Upsert year_in_review rows ─────────────────────────────────────────
    //    ON CONFLICT (user_id, year): leave existing rows untouched so a re-run
    //    on Jan 2nd doesn't reset a row the user already viewed.
    const upsertRows = userIds.map(userId => ({
      user_id: userId,
      year:    targetYear,
      pending: true
    }));

    const { error: upsertErr } = await supabase
      .from('year_in_review')
      .upsert(upsertRows, {
        onConflict:        'user_id,year',
        ignoreDuplicates:  true   // don't overwrite pending=false for users who already viewed
      });

    if (upsertErr) {
      console.error('Upsert failed:', upsertErr.message);
      return res.status(500).json({ error: 'Upsert failed' });
    }

    console.log(`Year in Review ${targetYear}: enrolled ${userIds.length} user(s).`);
    return res.status(200).json({ enrolled: userIds.length, year: targetYear });

  } catch (err) {
    console.error('Cron handler error:', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
