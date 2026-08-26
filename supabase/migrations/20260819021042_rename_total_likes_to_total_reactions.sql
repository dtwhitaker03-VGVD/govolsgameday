/* Rename total_likes → total_reactions in get_hover_card_data for terminology clarity (§22, §23, §30) */
CREATE OR REPLACE FUNCTION public.get_hover_card_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result              JSON;
  profile_record      RECORD;
  most_prestigious    TEXT;
  most_active_sport   TEXT;
  total_posts         INT;
  total_reactions     INT;
BEGIN
  SELECT * INTO profile_record FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT badge_key INTO most_prestigious
    FROM public.user_badges
    WHERE user_id = p_user_id
    ORDER BY awarded_at DESC
    LIMIT 1;

  SELECT sport INTO most_active_sport FROM (
    SELECT 'Football'   AS sport, profile_record.points_football   AS pts
    UNION ALL SELECT 'Basketball', profile_record.points_basketball
    UNION ALL SELECT 'Baseball',    profile_record.points_baseball
    UNION ALL SELECT 'Lady Vol',   profile_record.points_lady_vol
    UNION ALL SELECT 'Trivia',     profile_record.points_trivia
  ) s ORDER BY pts DESC LIMIT 1;

  SELECT count(*) INTO total_posts
    FROM public.forum_posts WHERE user_id = p_user_id;

  SELECT count(*) INTO total_reactions
    FROM public.forum_reactions r
    JOIN public.forum_posts p ON r.post_id = p.id
    WHERE p.user_id = p_user_id;

  SELECT json_build_object(
    'id',                   profile_record.id,
    'username',             profile_record.username,
    'avatar_url',           profile_record.avatar_url,
    'tagline',              profile_record.tagline,
    'hometown',             CASE WHEN profile_record.privacy_hide_hometown THEN NULL ELSE profile_record.hometown END,
    'created_at',           profile_record.created_at,
    'total_points',         CASE WHEN profile_record.privacy_hide_points THEN NULL ELSE profile_record.total_points END,
    'hot_streak_active',    profile_record.hot_streak_active,
    'current_streak_count', profile_record.current_streak_count,
    'threads_created_count',profile_record.threads_created_count,
    'threads_replied_count',profile_record.threads_replied_count,
    'total_posts',          total_posts,
    'total_reactions',      total_reactions,
    'most_prestigious_badge', most_prestigious,
    'most_active_sport',    most_active_sport,
    'is_premium',           profile_record.is_premium,
    'is_admin',             profile_record.is_admin
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;