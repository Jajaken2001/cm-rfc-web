-- 1. Preserve user-edited display names
CREATE OR REPLACE FUNCTION public.bootstrap_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  uid uuid := auth.uid();
  jwt_email text := lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'email', auth.jwt() ->> 'email', ''));
  meta jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  is_dev boolean;
  pre boolean;
  prof public.profiles;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  is_dev := jwt_email = public.protected_developer_email();
  SELECT EXISTS (SELECT 1 FROM public.preauthorized_emails p WHERE p.email = jwt_email) INTO pre;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_authorized, last_seen_at)
  VALUES (uid, jwt_email,
          coalesce(meta ->> 'full_name', meta ->> 'name'),
          coalesce(meta ->> 'avatar_url', meta ->> 'picture'),
          is_dev OR pre, now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = coalesce(public.profiles.full_name, EXCLUDED.full_name),
        avatar_url = coalesce(EXCLUDED.avatar_url, public.profiles.avatar_url),
        is_authorized = public.profiles.is_authorized OR is_dev OR pre,
        last_seen_at = now(),
        updated_at = now()
  RETURNING * INTO prof;

  IF is_dev THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'developer') ON CONFLICT DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = uid AND role <> 'developer';
  ELSIF pre THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'user') ON CONFLICT DO NOTHING;
    UPDATE public.preauthorized_emails SET claimed_at = now(), claimed_by = uid
      WHERE email = jwt_email AND claimed_at IS NULL;
  END IF;

  RETURN prof;
END;
$fn$;
