-- This week's 5 prop bets for TN vs Furman, entered via the new Weekly Prop
-- Bets admin panel. Future weeks get configured directly through that panel,
-- not another migration -- this one just carries this week's real content
-- into the repo since it was entered live before this migration existed.

INSERT INTO public.game_props (game_id, description, line, sort_order)
SELECT lg.id, v.description, v.line, v.sort_order
FROM public.live_games lg,
LATERAL (VALUES
  ('DeSean Bishop TDs', 2.5, 1),
  ('Mike Matthews TDs', 1.5, 2),
  ('Braylon Staley Receptions', 6.5, 3),
  ('Arion Carter Tackles', 8.5, 4),
  ('TN Sacks', 4.5, 5)
) AS v(description, line, sort_order)
WHERE lg.home_team = 'Tennessee' AND lg.away_team = 'Furman'
  AND NOT EXISTS (
    SELECT 1 FROM public.game_props gp
    WHERE gp.game_id = lg.id AND gp.description = v.description
  );
