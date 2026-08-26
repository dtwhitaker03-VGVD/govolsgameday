-- Increase pg_net timeout on invoke functions to 120s so the full Edge Function
-- response is captured in net._http_response for debugging.
-- (The 5s default caused a timeout entry — the function still ran to completion,
--  but the response body was unavailable in the debug table.)

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
    RAISE WARNING 'invoke_youtube_ingest: vault secrets not configured';
    RETURN;
  END IF;

  SELECT net.http_post(
    url                  := v_url || '/functions/v1/youtube-ingest',
    body                 := '{}'::jsonb,
    headers              := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    timeout_milliseconds := 120000
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
    RAISE WARNING 'invoke_news_ingest: vault secrets not configured';
    RETURN;
  END IF;

  SELECT net.http_post(
    url                  := v_url || '/functions/v1/news-ingest',
    body                 := '{}'::jsonb,
    headers              := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    timeout_milliseconds := 120000
  ) INTO v_request_id;

  RAISE LOG 'invoke_news_ingest: queued request_id=%', v_request_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_news_ingest failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
