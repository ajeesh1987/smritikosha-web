-- Migration: Year in Review support
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Make reels.memory_id nullable
--    Year in Review reels have no single parent memory.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE reels
  ALTER COLUMN memory_id DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add reel_type to reels
--    'memory'          → standard single-memory reel (existing behaviour)
--    'year_in_review'  → generated from all memories across a calendar year
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE reels
  ADD COLUMN IF NOT EXISTS reel_type text NOT NULL DEFAULT 'memory'
  CHECK (reel_type IN ('memory', 'year_in_review'));

-- Backfill existing rows so nothing is left with a null type
UPDATE reels SET reel_type = 'memory' WHERE reel_type IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. year_in_review table
--    One row per user per year. Tracks cron-triggered pending state and links
--    to the reel once it has been generated client-side.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS year_in_review (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year        int  NOT NULL,                          -- e.g. 2025
  pending     bool NOT NULL DEFAULT true,             -- true = not yet viewed/generated
  reel_id     uuid REFERENCES reels(id) ON DELETE SET NULL,  -- set after client generates
  created_at  timestamptz NOT NULL DEFAULT now(),
  viewed_at   timestamptz,                            -- set when user plays the reel

  UNIQUE (user_id, year)   -- one record per user per year
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS for year_in_review
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE year_in_review ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rows
CREATE POLICY "Users can read own year_in_review"
  ON year_in_review FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own rows (client marks pending=false, sets reel_id)
CREATE POLICY "Users can update own year_in_review"
  ON year_in_review FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No direct INSERT from client — only the cron (service role) inserts rows.
-- Service role bypasses RLS so no INSERT policy is needed.

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Index: fast lookup of pending rows on app load
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_yir_user_pending
  ON year_in_review (user_id, pending)
  WHERE pending = true;
