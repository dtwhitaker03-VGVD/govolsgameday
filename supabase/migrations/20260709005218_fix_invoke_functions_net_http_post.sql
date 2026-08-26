-- Fix invoke_youtube_ingest and invoke_news_ingest to use net.http_post
-- with the correct positional signature, and to not swallow errors silently.

CREATE OR REPLACE FUNCTION public.invoke_youtube_ingest()
RETURNS VOID AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_youtube_ingest: vault secrets not configured (url=%, key_present=%)',
      v_url IS NOT NULL, v_key IS NOT NULL;
    RETURN;
  END IF;

  SELECT net.http_post(
    url     := v_url || '/functions/v1/youtube-ingest',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  ) INTO v_request_id;

  RAISE LOG 'invoke_youtube_ingest: queued request_id=%', v_request_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_youtube_ingest failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.invoke_news_ingest()
RETURNS VOID AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_news_ingest: vault secrets not configured (url=%, key_present=%)',
      v_url IS NOT NULL, v_key IS NOT NULL;
    RETURN;
  END IF;

  SELECT net.http_post(
    url     := v_url || '/functions/v1/news-ingest',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  ) INTO v_request_id;

  RAISE LOG 'invoke_news_ingest: queued request_id=%', v_request_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_news_ingest failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
