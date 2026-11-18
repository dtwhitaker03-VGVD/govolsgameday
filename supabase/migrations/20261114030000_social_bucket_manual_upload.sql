-- Lets a manually-built social post upload its rendered image into the
-- existing 'social' storage bucket, so the automated social-publish pipeline
-- (which only reads social_posts.image_url, not how it got there) can post
-- it like any other queued row.
--
-- Scoped to a 'manual/' prefix inside the bucket so it can't be used to write
-- anywhere else, but note the anon key is public (shipped in the frontend),
-- so this does let anyone upload into that one prefix. Storage-abuse risk,
-- not a data-exposure one: the bucket is public-read already, and nothing
-- auto-posts from storage alone (social_posts has no public insert policy).

CREATE POLICY social_bucket_manual_upload ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'social' AND name LIKE 'manual/%');
