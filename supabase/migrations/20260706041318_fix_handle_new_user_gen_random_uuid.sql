
/*
# Fix handle_new_user() — replace uuid_generate_v4() with gen_random_uuid()

## Problem
uuid_generate_v4() lives in the extensions schema, not public, so the unqualified
call inside handle_new_user() fails with "function uuid_generate_v4() does not exist",
aborting the trigger and blocking every new sign-up.

## Fix
Replace uuid_generate_v4() with gen_random_uuid(), which is a native PostgreSQL
built-in available in all schemas with no extension required. It is already used
on every primary key column in the schema, so this is consistent.

The generated fallback username format is unchanged: 'VolFan' + 8 hex characters.
gen_random_uuid()::text produces a standard UUID string; replacing hyphens and
taking the first 8 characters gives a lowercase alphanumeric suffix that satisfies
the username_alphanumeric CHECK constraint.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'VolFan' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
