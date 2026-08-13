CREATE TABLE IF NOT EXISTS public.preauthorized_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  note text,
  added_by uuid,
  added_by_email text,
  claimed_at timestamptz,
  claimed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.preauthorized_emails TO authenticated;
GRANT ALL ON public.preauthorized_emails TO service_role;
ALTER TABLE public.preauthorized_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY preauth_select_staff ON public.preauthorized_emails
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.add_preauthorized_emails(_emails text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  actor uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'email', auth.jwt() ->> 'email', ''));
  e text;
  n integer := 0;
BEGIN
  IF NOT public.is_developer() THEN RAISE EXCEPTION 'Only developers can pre-authorize emails'; END IF;
  FOREACH e IN ARRAY _emails LOOP
    e := lower(trim(e));
    CONTINUE WHEN e = '' OR e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';
    INSERT INTO public.preauthorized_emails (email, added_by, added_by_email)
    VALUES (e, actor, actor_email)
    ON CONFLICT (email) DO NOTHING;
    IF FOUND THEN n := n + 1; END IF;
    UPDATE public.profiles SET is_authorized = true, updated_at = now() WHERE email = e AND NOT is_authorized;
  END LOOP;
  PERFORM public.write_audit('preauthorize_emails', 'preauthorized_emails', NULL, jsonb_build_object('count', n));
  RETURN n;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.delete_preauthorized_email(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE em text;
BEGIN
  IF NOT public.is_developer() THEN RAISE EXCEPTION 'Only developers can remove pre-authorized emails'; END IF;
  DELETE FROM public.preauthorized_emails WHERE id = _id RETURNING email INTO em;
  PERFORM public.write_audit('preauthorize_email_removed', 'preauthorized_emails', _id::text, jsonb_build_object('email', em));
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.add_preauthorized_emails(text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_preauthorized_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_preauthorized_emails(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_preauthorized_email(uuid) TO authenticated;
