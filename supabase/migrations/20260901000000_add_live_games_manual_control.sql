-- Lets an admin flag a game as manually controlled from the Admin
-- Dashboard, so the automatic CFBD poller (live-cfbd-sync, via the
-- invoke_live_cfbd_sync cron job) skips it entirely instead of racing
-- open_drive_window/settle_drive_outcome against a manual admin call for
-- the same drive.

ALTER TABLE public.live_games
  ADD COLUMN IF NOT EXISTS manual_control BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.live_games.manual_control IS
  'When true, live-cfbd-sync skips this game entirely so an admin can manually run drive_windows via open_drive_window/settle_drive_outcome without the automatic poller racing it.';

CREATE OR REPLACE FUNCTION public.admin_set_manual_control(p_game_id UUID, p_manual_control BOOLEAN)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: admin access required.';
    END IF;
  END IF;

  UPDATE public.live_games
  SET manual_control = p_manual_control
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found.';
  END IF;
END;
$$;
