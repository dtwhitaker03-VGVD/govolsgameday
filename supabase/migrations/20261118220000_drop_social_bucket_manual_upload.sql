-- Removes the public INSERT policy added in 20261114030000. It applied to
-- every role (including anon, whose key ships in the frontend) on a
-- public-read bucket with no size or MIME limits, so anyone could host
-- arbitrary files under social/manual/. It was never used, and the automated
-- social-plan pipeline uploads with the service-role key, which bypasses RLS,
-- so nothing depends on it. Manual images can be uploaded via the dashboard.

DROP POLICY IF EXISTS social_bucket_manual_upload ON storage.objects;
