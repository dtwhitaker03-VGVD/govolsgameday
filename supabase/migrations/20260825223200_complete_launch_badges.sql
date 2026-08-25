/*
# Complete the 16 Launch Badges + Forum/Reaction/Quote General Badges

## Summary
9 of the 16 launch badges (§31) were already awarded inline by
`finalize_game`/`settle_drive_outcome`. This migration completes the
remaining 7:
- Forum Interaction Track (3): new_thread_created, hot_thread, going_viral_thread
- Gameday Prediction Track season/year badges (4): season_top_10,
  season_champion, all_sport_top_10, all_sport_champion — via a new
  evaluate_season_badges() RPC, since no season-boundary concept exists
  in the schema yet. Documented as manually invoked for now.

Also completes the general-track badges that hang off existing forum
triggers (thread/reply/quote milestones) and adds a new forum_reactions
trigger for reaction-received badges, since those conditions are cheapest
to check at the exact point the underlying counter already changes.

## Changes
- `increment_threads_created_count()`: now also awards new_thread_created,
  thread_starter, prolific_poster, forum_veteran.
- `on_forum_post_created()`: now also awards first_reply, conversationalist,
  forum_regular, and (independent of is_op) quotable when a post is quoted
  10 times.
- `increment_thread_view()`: now also awards hot_thread/going_viral_thread
  to the thread's author when view_count crosses 1,000/10,000 within 24h
  of the thread's created_at.
- New trigger `on_forum_reaction_added` (AFTER INSERT ON forum_reactions):
  awards well_liked/crowd_favorite/beloved_by_vol_nation (total reactions
  on the recipient's posts), big_brain_award (25x 'big_brain'), and
  hot_take_haver (15x 'fire').
- New RPC `evaluate_season_badges()`, SECURITY DEFINER, manually invoked.

## Security
- All SECURITY DEFINER, matching every existing trigger in this schema.
- No RLS changes — badge awards only ever insert into user_badges, which
  already has "read-only for all; writes via functions/triggers" RLS.
*/

-- ── 1. Thread creation: new_thread_created + count milestones ───────────────

CREATE OR REPLACE FUNCTION public.increment_threads_created_count()
RETURNS TRIGGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
      SET threads_created_count = threads_created_count + 1
      WHERE id = NEW.user_id
      RETURNING threads_created_count INTO v_new_count;

    INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'new_thread_created')
    ON CONFLICT (user_id, badge_key) DO NOTHING;

    IF v_new_count = 5 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'thread_starter')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    ELSIF v_new_count = 25 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'prolific_poster')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    ELSIF v_new_count = 50 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'forum_veteran')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. Forum replies: first_reply/conversationalist/forum_regular + quotable ──

CREATE OR REPLACE FUNCTION public.on_forum_post_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_new_count      INTEGER;
  v_quoted_author  UUID;
  v_quote_count    INTEGER;
BEGIN
  IF NEW.is_op = false THEN
    UPDATE public.forum_threads
    SET reply_count = reply_count + 1,
        last_active_at = now()
    WHERE id = NEW.thread_id;

    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET threads_replied_count = threads_replied_count + 1
      WHERE id = NEW.user_id
      RETURNING threads_replied_count INTO v_new_count;

      IF v_new_count = 1 THEN
        INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'first_reply')
        ON CONFLICT (user_id, badge_key) DO NOTHING;
      ELSIF v_new_count = 25 THEN
        INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'conversationalist')
        ON CONFLICT (user_id, badge_key) DO NOTHING;
      ELSIF v_new_count = 100 THEN
        INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'forum_regular')
        ON CONFLICT (user_id, badge_key) DO NOTHING;
      END IF;
    END IF;
  END IF;

  -- Quotable: award the quoted post's author once they've been quoted 10 times
  IF NEW.quoted_post_id IS NOT NULL THEN
    SELECT user_id INTO v_quoted_author FROM public.forum_posts WHERE id = NEW.quoted_post_id;

    IF v_quoted_author IS NOT NULL THEN
      SELECT COUNT(*) INTO v_quote_count
        FROM public.forum_posts fp
        JOIN public.forum_posts orig ON orig.id = fp.quoted_post_id
        WHERE orig.user_id = v_quoted_author;

      IF v_quote_count >= 10 THEN
        INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_quoted_author, 'quotable')
        ON CONFLICT (user_id, badge_key) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 3. Thread views: hot_thread / going_viral_thread ─────────────────────────

CREATE OR REPLACE FUNCTION public.increment_thread_view(p_thread_id UUID)
RETURNS VOID AS $$
DECLARE
  v_thread RECORD;
BEGIN
  UPDATE public.forum_threads
    SET view_count = view_count + 1
    WHERE id = p_thread_id
    RETURNING view_count, user_id, created_at INTO v_thread;

  IF v_thread.user_id IS NOT NULL AND NOW() - v_thread.created_at <= INTERVAL '24 hours' THEN
    IF v_thread.view_count = 1000 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_thread.user_id, 'hot_thread')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    ELSIF v_thread.view_count = 10000 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_thread.user_id, 'going_viral_thread')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Reactions received: well_liked / crowd_favorite / beloved_by_vol_nation
--       / big_brain_award / hot_take_haver ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.on_forum_reaction_added()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient    UUID;
  v_total        INTEGER;
  v_big_brain    INTEGER;
  v_fire         INTEGER;
BEGIN
  SELECT user_id INTO v_recipient FROM public.forum_posts WHERE id = NEW.post_id;
  IF v_recipient IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total
    FROM public.forum_reactions r
    JOIN public.forum_posts p ON r.post_id = p.id
    WHERE p.user_id = v_recipient;

  IF v_total = 50 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_recipient, 'well_liked')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_total = 250 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_recipient, 'crowd_favorite')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_total = 1000 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_recipient, 'beloved_by_vol_nation')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF NEW.reaction = 'big_brain' THEN
    SELECT COUNT(*) INTO v_big_brain
      FROM public.forum_reactions r
      JOIN public.forum_posts p ON r.post_id = p.id
      WHERE p.user_id = v_recipient AND r.reaction = 'big_brain';
    IF v_big_brain = 25 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_recipient, 'big_brain_award')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    END IF;
  ELSIF NEW.reaction = 'fire' THEN
    SELECT COUNT(*) INTO v_fire
      FROM public.forum_reactions r
      JOIN public.forum_posts p ON r.post_id = p.id
      WHERE p.user_id = v_recipient AND r.reaction = 'fire';
    IF v_fire = 15 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_recipient, 'hot_take_haver')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_forum_reaction_added ON public.forum_reactions;
CREATE TRIGGER on_forum_reaction_added
  AFTER INSERT ON public.forum_reactions
  FOR EACH ROW EXECUTE FUNCTION public.on_forum_reaction_added();

-- ── 5. Season / all-sport badges — manually invoked, no season-boundary data ─

CREATE OR REPLACE FUNCTION public.evaluate_season_badges()
RETURNS VOID AS $$
DECLARE
  v_sport_col TEXT;
BEGIN
  -- Season top 10 / champion — evaluated once per sport-points column, since
  -- the badge itself doesn't distinguish which sport (no season-boundary
  -- data exists yet to scope this more precisely).
  FOREACH v_sport_col IN ARRAY ARRAY['points_football', 'points_basketball', 'points_baseball', 'points_lady_vol']
  LOOP
    EXECUTE format($f$
      INSERT INTO public.user_badges (user_id, badge_key)
      SELECT id, 'season_top_10' FROM (
        SELECT id, RANK() OVER (ORDER BY %1$I DESC) r FROM public.profiles WHERE %1$I > 0
      ) s WHERE r <= 10
      ON CONFLICT (user_id, badge_key) DO NOTHING
    $f$, v_sport_col);

    EXECUTE format($f$
      INSERT INTO public.user_badges (user_id, badge_key)
      SELECT id, 'season_champion' FROM (
        SELECT id, RANK() OVER (ORDER BY %1$I DESC) r FROM public.profiles WHERE %1$I > 0
      ) s WHERE r = 1
      ON CONFLICT (user_id, badge_key) DO NOTHING
    $f$, v_sport_col);
  END LOOP;

  -- All-sport top 10 / champion
  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT id, 'all_sport_top_10' FROM (
    SELECT id, RANK() OVER (ORDER BY total_points DESC) r FROM public.profiles WHERE total_points > 0
  ) s WHERE r <= 10
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT id, 'all_sport_champion' FROM (
    SELECT id, RANK() OVER (ORDER BY total_points DESC) r FROM public.profiles WHERE total_points > 0
  ) s WHERE r = 1
  ON CONFLICT (user_id, badge_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
