-- ── 1. Add channel curation columns to scraped_videos ──────────────────────
ALTER TABLE public.scraped_videos
  ADD COLUMN IF NOT EXISTS channel_name     TEXT,
  ADD COLUMN IF NOT EXISTS channel_priority INTEGER;
  -- is_hidden already exists

-- Index: channel-priority fetches (Main Page Tier 1 / Tier 2) — not partial on
-- sport_category since priority-tagged videos may land in any category bucket.
CREATE INDEX IF NOT EXISTS idx_videos_channel_priority_date
  ON public.scraped_videos (channel_priority, ingested_at DESC)
  WHERE channel_priority IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_channel_priority_views
  ON public.scraped_videos (channel_priority, view_count DESC)
  WHERE channel_priority IS NOT NULL;

-- ── 2. Vault-setup RPC called by the setup-vault-secrets Edge Function ──────
-- SECURITY DEFINER so the service-role client (from the Edge Function) can
-- write secrets to vault even though the anon/authenticated roles cannot.
CREATE OR REPLACE FUNCTION public.setup_vgd_vault_secrets(
  p_project_url       TEXT,
  p_service_role_key  TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_id UUID;
BEGIN
  -- vgd_project_url: update if exists, create if not
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'vgd_project_url';
  IF v_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_id, p_project_url);
  ELSE
    PERFORM vault.create_secret(p_project_url, 'vgd_project_url');
  END IF;

  -- vgd_service_role_key: update if exists, create if not
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'vgd_service_role_key';
  IF v_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_id, p_service_role_key);
  ELSE
    PERFORM vault.create_secret(p_service_role_key, 'vgd_service_role_key');
  END IF;

  RETURN 'vault secrets configured';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
