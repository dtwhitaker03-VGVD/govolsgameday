
ALTER TABLE scraped_videos ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE scraped_articles ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS scraped_videos_is_hidden_idx ON scraped_videos(is_hidden);
CREATE INDEX IF NOT EXISTS scraped_articles_is_hidden_idx ON scraped_articles(is_hidden);

-- Admin can update and delete scraped content (RLS for admin write access)
-- Admins are identified by is_admin = true in profiles table
CREATE POLICY "admin_update_scraped_videos" ON scraped_videos FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_delete_scraped_videos" ON scraped_videos FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_update_scraped_articles" ON scraped_articles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_delete_scraped_articles" ON scraped_articles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
