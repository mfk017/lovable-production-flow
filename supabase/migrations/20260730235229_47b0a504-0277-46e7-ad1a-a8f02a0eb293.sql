CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  should_bootstrap_admin boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(77880101);

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO should_bootstrap_admin;

  INSERT INTO public.profiles (id, full_name, username, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'username',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      username = COALESCE(EXCLUDED.username, public.profiles.username),
      approved = true;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN should_bootstrap_admin THEN 'admin'::app_role ELSE 'worker'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

ALTER TABLE public.profiles ALTER COLUMN approved SET DEFAULT true;

UPDATE public.profiles SET approved = true WHERE approved = false;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'worker'::app_role
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
ON CONFLICT (user_id, role) DO NOTHING;