CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  should_bootstrap_admin boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(77880101);

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  ) INTO should_bootstrap_admin;

  INSERT INTO public.profiles (id, full_name, username, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'username',
    should_bootstrap_admin
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    approved = public.profiles.approved OR should_bootstrap_admin;

  IF should_bootstrap_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;