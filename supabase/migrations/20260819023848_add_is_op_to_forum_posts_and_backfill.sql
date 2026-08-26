-- Add is_op column to forum_posts so the OP can be a real post row
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS is_op BOOLEAN NOT NULL DEFAULT false;

-- Update the trigger function to skip reply_count increment for OP posts
CREATE OR REPLACE FUNCTION public.on_forum_post_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.is_op = false THEN
    UPDATE public.forum_threads
    SET reply_count = reply_count + 1,
        last_active_at = now()
    WHERE id = NEW.thread_id;

    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET threads_replied_count = threads_replied_count + 1
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill: create OP posts for existing threads that don't have one
INSERT INTO public.forum_posts (thread_id, user_id, username, body, is_op, created_at)
SELECT t.id, t.user_id, t.username, COALESCE(t.body, t.title), true, t.created_at
FROM public.forum_threads t
WHERE NOT EXISTS (
  SELECT 1 FROM public.forum_posts p WHERE p.thread_id = t.id AND p.is_op = true
)
AND t.body IS NOT NULL;

-- For threads with no body, still create an OP post with the title as body
INSERT INTO public.forum_posts (thread_id, user_id, username, body, is_op, created_at)
SELECT t.id, t.user_id, t.username, t.title, true, t.created_at
FROM public.forum_threads t
WHERE NOT EXISTS (
  SELECT 1 FROM public.forum_posts p WHERE p.thread_id = t.id AND p.is_op = true
)
AND t.body IS NULL;