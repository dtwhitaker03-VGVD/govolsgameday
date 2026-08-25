
-- ── 1. Unique constraints for upsert safety ───────────────────────────────
ALTER TABLE public.scraped_videos
  ADD COLUMN IF NOT EXISTS youtube_video_id VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scraped_videos_youtube_video_id_key'
  ) THEN
    ALTER TABLE public.scraped_videos
      ADD CONSTRAINT scraped_videos_youtube_video_id_key UNIQUE (youtube_video_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scraped_articles_source_url_key'
  ) THEN
    ALTER TABLE public.scraped_articles
      ADD CONSTRAINT scraped_articles_source_url_key UNIQUE (source_url);
  END IF;
END $$;

-- ── 2. Enable scheduling / async-HTTP extensions ──────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ── 3. Seed system_health rows ─────────────────────────────────────────────
INSERT INTO public.system_health (source_name, status)
VALUES
  ('youtube_ingestion', 'unknown'),
  ('news_ingestion',    'unknown')
ON CONFLICT (source_name) DO NOTHING;

-- ── 4. Store project URL in vault ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'vgd_project_url') THEN
    PERFORM vault.create_secret(
      'https://oacplcoflxfjtmmwxiep.supabase.co',
      'vgd_project_url'
    );
  END IF;
END $$;

-- ── 5. Invoker functions (read service role key from vault at runtime) ─────
CREATE OR REPLACE FUNCTION public.invoke_youtube_ingest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_youtube_ingest: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM extensions.http_post(
    url     := v_url || '/functions/v1/youtube-ingest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_youtube_ingest failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.invoke_news_ingest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_news_ingest: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM extensions.http_post(
    url     := v_url || '/functions/v1/news-ingest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_news_ingest failed: %', SQLERRM;
END;
$$;

-- ── 6. Register pg_cron schedules ─────────────────────────────────────────
-- 6 AM EST = 11:00 UTC  |  6 PM EST = 23:00 UTC
SELECT cron.schedule('youtube-ingest-6am', '0 11 * * *', 'SELECT public.invoke_youtube_ingest()');
SELECT cron.schedule('youtube-ingest-6pm', '0 23 * * *', 'SELECT public.invoke_youtube_ingest()');
SELECT cron.schedule('news-ingest-6am',    '0 11 * * *', 'SELECT public.invoke_news_ingest()');
SELECT cron.schedule('news-ingest-6pm',    '0 23 * * *', 'SELECT public.invoke_news_ingest()');
