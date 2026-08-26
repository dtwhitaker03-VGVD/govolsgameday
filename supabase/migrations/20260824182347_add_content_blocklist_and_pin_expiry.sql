/*
# Content Blocklist + Article Pin Expiry

## Purpose
1. Creates `content_blocklist` table so deleted scraped content is never re-ingested.
2. Adds `pin_expires_at` column to `scraped_articles` for 14-day pin expiry.
3. Adds INSERT policies to `scraped_videos` and `scraped_articles` so admin tools
   (Add Video, Add Article) can insert new rows directly from the admin panel.

## 1. New Table: content_blocklist
- `id` (uuid, primary key)
- `content_type` (text, 'video' or 'article')
- `external_id` (text — YouTube video ID for videos, query-param-stripped URL for articles)
- `blocked_at` (timestamptz, default now)
- `blocked_by` (uuid, FK to profiles.id — admin who blocked it)
- UNIQUE(content_type, external_id) prevents duplicate blocklist entries
- Index on (content_type, external_id) for fast lookup during ingestion

## 2. Modified Table: scraped_articles
- Adds `pin_expires_at` (timestamptz, nullable) — set to NOW() + 14 days when pinned.
  When NULL or past, the article loses guaranteed placement and falls back to
  normal published_at sorting.

## 3. Security / RLS
- content_blocklist: RLS enabled. SELECT restricted to admin (is_admin = true).
  No INSERT/UPDATE/DELETE policies for anon — only service role (edge functions)
  and admin-authenticated users can write. Admin gets SELECT + INSERT + DELETE.
- scraped_videos: adds admin INSERT policy (for Add Video tool).
- scraped_articles: adds admin INSERT policy (for Add Article tool).

## 4. Ingestion Behavior
- YouTube ingest (Job 1) and news ingest (Job 2) must query content_blocklist
  before upserting. Any video/article whose external_id matches a blocklist row
  is skipped entirely. This is enforced in the edge function code, not the DB.
- Add Video / Add Article tools deliberately do NOT check the blocklist —
  a manual paste is a deliberate override.
*/

-- ── content_blocklist table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_blocklist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  TEXT NOT NULL CHECK (content_type IN ('video','article')),
  external_id   TEXT NOT NULL,
  blocked_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_by    UUID REFERENCES public.profiles(id),
  UNIQUE(content_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_blocklist_lookup
  ON public.content_blocklist(content_type, external_id);

ALTER TABLE public.content_blocklist ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT (service role bypasses RLS automatically)
DROP POLICY IF EXISTS "admin_select_blocklist" ON public.content_blocklist;
CREATE POLICY "admin_select_blocklist" ON public.content_blocklist
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Admin-only INSERT
DROP POLICY IF EXISTS "admin_insert_blocklist" ON public.content_blocklist;
CREATE POLICY "admin_insert_blocklist" ON public.content_blocklist
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Admin-only DELETE (for unblocking if ever needed)
DROP POLICY IF EXISTS "admin_delete_blocklist" ON public.content_blocklist;
CREATE POLICY "admin_delete_blocklist" ON public.content_blocklist
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ── pin_expires_at on scraped_articles ───────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'scraped_articles'
      AND column_name = 'pin_expires_at'
  ) THEN
    ALTER TABLE public.scraped_articles
      ADD COLUMN pin_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ── Admin INSERT policies for scraped_videos and scraped_articles ─────────────
-- Needed for the Add Video / Add Article admin tools to insert new rows.

DROP POLICY IF EXISTS "admin_insert_scraped_videos" ON public.scraped_videos;
CREATE POLICY "admin_insert_scraped_videos" ON public.scraped_videos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_insert_scraped_articles" ON public.scraped_articles;
CREATE POLICY "admin_insert_scraped_articles" ON public.scraped_articles
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
