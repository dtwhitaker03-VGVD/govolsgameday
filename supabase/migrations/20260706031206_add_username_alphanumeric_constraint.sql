
/*
# Server-side username validation + auto-generated username fix

## Summary
Adds a CHECK constraint to profiles.username enforcing the alphanumeric-only rule from §5.
Also updates the handle_new_user() trigger to omit the underscore separator in auto-generated
Google OAuth usernames, keeping them compliant with the new constraint.

## Changes

### profiles table
- New CHECK constraint `username_alphanumeric`: enforces `^[A-Za-z0-9]+$`
  (no spaces, no hyphens, no underscores — letters and numbers only, max 50 chars already
  enforced by VARCHAR(50))

### handle_new_user() function
- Auto-generated Google OAuth fallback username changed from `'VolFan_' || ...` to
  `'VolFan' || ...` (removed underscore separator so the generated value is alphanumeric)
- The hex substring from uuid_generate_v4() is lowercase a-f and 0-9, which satisfies
  the new CHECK constraint

## Notes
- The ADD CONSTRAINT is idempotent via DROP IF EXISTS first
- Existing rows with underscores in usernames (if any) would need manual correction
  before this constraint can be added; for a fresh database this is safe to apply immediately
*/

-- Update handle_new_user to generate a username without an underscore separator
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'VolFan' || substring(replace(uuid_generate_v4()::text, '-', ''), 1, 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add alphanumeric CHECK constraint to profiles.username
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS username_alphanumeric;

ALTER TABLE public.profiles
  ADD CONSTRAINT username_alphanumeric
  CHECK (username ~ '^[A-Za-z0-9]+$');
