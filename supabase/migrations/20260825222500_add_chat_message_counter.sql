/*
# Chat Message Counter + Chat Badges

## Summary
Adds a `chat_messages_sent` counter to `profiles`, maintained by a new
AFTER INSERT trigger on `chat_messages` (same shape as the existing
`increment_threads_created_count()` trigger on `forum_threads`). Awards
the 3 chat-milestone badges inline at the same point.

## Changes
- New column `profiles.chat_messages_sent INTEGER DEFAULT 0`.
- New trigger function `increment_chat_messages_sent()` + trigger
  `on_chat_message_sent` (AFTER INSERT ON chat_messages).

## Security
- SECURITY DEFINER, same as increment_threads_created_count — needed so a
  user whose only grant is INSERT on chat_messages can still update their
  own profiles row and insert into user_badges.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_messages_sent INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_chat_messages_sent()
RETURNS TRIGGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
    SET chat_messages_sent = chat_messages_sent + 1
    WHERE id = NEW.user_id
    RETURNING chat_messages_sent INTO v_new_count;

  IF v_new_count = 1 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'breaking_the_ice')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_new_count = 250 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'chatterbox')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_new_count = 1000 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'town_hall_regular')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chat_message_sent ON public.chat_messages;
CREATE TRIGGER on_chat_message_sent
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.increment_chat_messages_sent();
