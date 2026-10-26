-- Admin controls for the social posting queue (Admin Dashboard -> Social Posts).
-- Admin-only: the caller must be a signed-in admin. The tables themselves stay
-- read-only for clients (admin SELECT policies only).

CREATE OR REPLACE FUNCTION public.admin_social_cancel(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required.';
  END IF;
  UPDATE public.social_posts SET status = 'canceled', error = 'canceled by admin'
  WHERE id = p_id AND status = 'scheduled';
  IF NOT FOUND THEN RAISE EXCEPTION 'That post is no longer waiting to go out.'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_social_post_now(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required.';
  END IF;
  UPDATE public.social_posts SET scheduled_for = now()
  WHERE id = p_id AND status = 'scheduled';
  IF NOT FOUND THEN RAISE EXCEPTION 'That post is no longer waiting to go out.'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_social_update_settings(
  p_enabled BOOLEAN, p_test_mode BOOLEAN, p_mode TEXT, p_veto_hours INTEGER,
  p_post_facebook BOOLEAN, p_post_instagram BOOLEAN
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required.';
  END IF;
  IF p_mode NOT IN ('veto', 'auto') THEN RAISE EXCEPTION 'Invalid mode.'; END IF;
  IF p_veto_hours < 0 OR p_veto_hours > 48 THEN RAISE EXCEPTION 'Veto window must be 0-48 hours.'; END IF;
  UPDATE public.social_settings SET
    enabled = p_enabled, test_mode = p_test_mode, mode = p_mode, veto_hours = p_veto_hours,
    post_facebook = p_post_facebook, post_instagram = p_post_instagram, updated_at = now()
  WHERE id = TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_social_cancel(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_social_post_now(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_social_update_settings(BOOLEAN, BOOLEAN, TEXT, INTEGER, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_social_cancel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_social_post_now(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_social_update_settings(BOOLEAN, BOOLEAN, TEXT, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;
