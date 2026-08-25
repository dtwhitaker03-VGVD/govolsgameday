
/*
# Add username_is_default flag to profiles

## Purpose
Allows the app to detect Google OAuth sign-ups that received an auto-generated username
and prompt the user to choose their own before accessing the site.

## Changes

### profiles table
- New column `username_is_default BOOLEAN DEFAULT FALSE`
  TRUE  = username was auto-generated (Google OAuth with no username in metadata)
  FALSE = user chose their own username (credential sign-up, or after completing the
          post-OAuth username selection step)

### handle_new_user() function
- Sets username_is_default = TRUE when falling back to the generated 'VolFan' + hex name
- Sets username_is_default = FALSE when a real username was provided in raw_user_meta_data
  (i.e. credential sign-ups, which always pass username as user metadata)
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_is_default BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  provided_username TEXT;
  generated_username TEXT;
  use_default BOOLEAN;
BEGIN
  provided_username := NEW.raw_user_meta_data->>'username';
  generated_username := 'VolFan' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  IF provided_username IS NOT NULL AND provided_username <> '' THEN
    use_default := FALSE;
  ELSE
    provided_username := generated_username;
    use_default := TRUE;
  END IF;

  INSERT INTO public.profiles (id, username, avatar_url, username_is_default)
  VALUES (
    NEW.id,
    provided_username,
    NEW.raw_user_meta_data->>'avatar_url',
    use_default
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
