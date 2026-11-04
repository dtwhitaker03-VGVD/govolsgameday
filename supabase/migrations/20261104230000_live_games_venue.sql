-- Where the game is played (e.g. "Physical Education Complex · Baltimore, MD"), from ESPN;
-- shown on the Upcoming Games cards, notably for road games.
ALTER TABLE public.live_games ADD COLUMN IF NOT EXISTS venue TEXT;
