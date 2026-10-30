-- Every account created by Supabase Auth must have an operational profile.
-- The role is intentionally fixed as visitante; user metadata must never grant roles.
CREATE OR REPLACE FUNCTION public.create_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    role,
    is_active,
    created_by,
    updated_by
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    'visitante',
    TRUE,
    NEW.id,
    NEW.id
  )
  ON CONFLICT (email) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = EXCLUDED.updated_by
  WHERE public.profiles.user_id IS NULL
     OR public.profiles.user_id = EXCLUDED.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_profile_after_auth_signup ON auth.users;
CREATE TRIGGER create_profile_after_auth_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_auth_user();

-- Repair profiles that already share the Auth account e-mail but lack user_id.
UPDATE public.profiles AS profile
SET
  user_id = user_account.id,
  full_name = COALESCE(
    profile.full_name,
    NULLIF(TRIM(user_account.raw_user_meta_data ->> 'full_name'), '')
  ),
  updated_at = CURRENT_TIMESTAMP,
  updated_by = user_account.id
FROM auth.users AS user_account
WHERE profile.email = user_account.email
  AND (profile.user_id IS NULL OR profile.user_id = user_account.id);

-- Create profiles for accounts that were created before the trigger existed.
INSERT INTO public.profiles (
  user_id,
  email,
  full_name,
  role,
  is_active,
  created_by,
  updated_by
)
SELECT
  user_account.id,
  user_account.email,
  NULLIF(TRIM(user_account.raw_user_meta_data ->> 'full_name'), ''),
  'visitante',
  TRUE,
  user_account.id,
  user_account.id
FROM auth.users AS user_account
WHERE user_account.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles AS existing_profile
    WHERE existing_profile.user_id = user_account.id
       OR existing_profile.email = user_account.email
  );

REVOKE ALL ON FUNCTION public.create_profile_for_auth_user() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
