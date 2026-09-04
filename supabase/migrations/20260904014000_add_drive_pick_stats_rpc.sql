-- Aggregate pick counts per outcome for one settled drive. drive_predictions'
-- RLS intentionally restricts a live game to each user's own rows (see
-- CLAUDE.md), so a client-side query can't compute "what % picked each
-- outcome" itself -- this SECURITY DEFINER function does the aggregation
-- server-side and returns only counts, never individual picks or user ids.
create or replace function public.get_drive_pick_stats(p_game_id uuid, p_drive_number integer)
returns table (prediction text, pick_count integer)
language sql
security definer
stable
as $$
  select prediction, count(*)::int as pick_count
  from public.drive_predictions
  where game_id = p_game_id and drive_number = p_drive_number
  group by prediction;
$$;
