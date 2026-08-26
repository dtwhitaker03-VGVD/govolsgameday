-- Remove the Touchdown Video System entirely (§15 removed from spec).
-- The table was architecture-only with no data; safe to drop.
DROP TABLE IF EXISTS public.touchdown_videos CASCADE;
