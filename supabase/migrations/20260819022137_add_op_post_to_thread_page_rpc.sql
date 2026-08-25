/* Update get_thread_page to also return the OP's first post (so the OP can use the same PostCard with a real post ID for reactions/reports) */
CREATE OR REPLACE FUNCTION public.get_thread_page(
  p_thread_id UUID,
  p_page      INT DEFAULT 1,
  p_per_page  INT DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
  thread_record  RECORD;
  posts_data     JSON;
  op_post_data   JSON;
  offset_val     INT;
BEGIN
  SELECT * INTO thread_record FROM public.forum_threads WHERE id = p_thread_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  offset_val := (p_page - 1) * p_per_page;

  -- Fetch the OP's first post (the oldest post in the thread, which is the opening post)
  SELECT json_build_object(
    'id',          post_row.id,
    'user_id',     post_row.user_id,
    'username',    post_row.username,
    'body',        post_row.body,
    'quoted_post_id', post_row.quoted_post_id,
    'edited_at',   post_row.edited_at,
    'created_at',  post_row.created_at,
    'reactions',   COALESCE(r.reaction_counts, '{}'::json)
  )
  INTO op_post_data
  FROM (
    SELECT id, user_id, username, body, quoted_post_id, edited_at, created_at
    FROM public.forum_posts
    WHERE thread_id = p_thread_id
    ORDER BY created_at ASC
    LIMIT 1
  ) post_row
  LEFT JOIN LATERAL (
    SELECT json_object_agg(reaction, cnt) AS reaction_counts
    FROM (
      SELECT reaction, count(*) AS cnt
      FROM public.forum_reactions
      WHERE post_id = post_row.id
      GROUP BY reaction
    ) rc
  ) r ON true;

  -- Fetch paginated posts (all posts including OP, ordered by created_at)
  SELECT json_agg(json_build_object(
    'id',          post_row.id,
    'user_id',     post_row.user_id,
    'username',    post_row.username,
    'body',        post_row.body,
    'quoted_post_id', post_row.quoted_post_id,
    'edited_at',   post_row.edited_at,
    'created_at',  post_row.created_at,
    'reactions',   COALESCE(r.reaction_counts, '{}'::json)
  ) ORDER BY post_row.created_at ASC)
  INTO posts_data
  FROM (
    SELECT id, user_id, username, body, quoted_post_id, edited_at, created_at
    FROM public.forum_posts
    WHERE thread_id = p_thread_id
    ORDER BY created_at ASC
    LIMIT p_per_page OFFSET offset_val
  ) post_row
  LEFT JOIN LATERAL (
    SELECT json_object_agg(reaction, cnt) AS reaction_counts
    FROM (
      SELECT reaction, count(*) AS cnt
      FROM public.forum_reactions
      WHERE post_id = post_row.id
      GROUP BY reaction
    ) rc
  ) r ON true;

  RETURN json_build_object(
    'thread', json_build_object(
      'id',             thread_record.id,
      'user_id',        thread_record.user_id,
      'username',       thread_record.username,
      'title',          thread_record.title,
      'body',           thread_record.body,
      'category',       thread_record.category,
      'reply_count',    thread_record.reply_count,
      'view_count',     thread_record.view_count,
      'created_at',     thread_record.created_at,
      'last_active_at', thread_record.last_active_at
    ),
    'op_post', op_post_data,
    'posts', COALESCE(posts_data, '[]'::json),
    'page', p_page,
    'per_page', p_per_page
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_thread_page(UUID, INT, INT) TO anon, authenticated;