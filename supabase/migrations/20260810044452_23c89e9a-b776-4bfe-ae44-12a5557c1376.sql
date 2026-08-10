-- 1. Media on notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Chat rooms visible to any authorized role listed on the room
DROP POLICY IF EXISTS rooms_select ON public.chat_rooms;
CREATE POLICY rooms_select ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (
    public.is_developer()
    OR (
      public.my_role() = ANY (allowed_roles)
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_authorized)
    )
  );

-- 3. Developer-only deletions
CREATE OR REPLACE FUNCTION public.delete_deduction(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.deductions;
BEGIN
  IF NOT public.is_developer() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO d FROM public.deductions WHERE id = _id;
  IF d IS NULL THEN RAISE EXCEPTION 'Deduction not found'; END IF;
  DELETE FROM public.deductions WHERE id = _id;
  PERFORM public.write_audit('deduction.delete','deduction', _id::text,
    jsonb_build_object('employee', d.user_email, 'amount', d.amount, 'reason', d.reason));
END; $$;

CREATE OR REPLACE FUNCTION public.delete_invite_link(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE l public.invite_links;
BEGIN
  IF NOT public.is_developer() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO l FROM public.invite_links WHERE id = _id;
  IF l IS NULL THEN RAISE EXCEPTION 'Access link not found'; END IF;
  DELETE FROM public.invite_redemptions WHERE invite_id = _id;
  DELETE FROM public.invite_links WHERE id = _id;
  PERFORM public.write_audit('invite.delete','invite_link', _id::text,
    jsonb_build_object('label', l.label, 'used_count', l.used_count));
END; $$;

CREATE OR REPLACE FUNCTION public.delete_notification(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n public.notifications;
BEGIN
  IF NOT public.is_developer() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO n FROM public.notifications WHERE id = _id;
  IF n IS NULL THEN RAISE EXCEPTION 'Update not found'; END IF;
  DELETE FROM public.notification_acknowledgements WHERE notification_id = _id;
  DELETE FROM public.notifications WHERE id = _id;
  PERFORM public.write_audit('notification.delete','notification', _id::text,
    jsonb_build_object('title', n.title));
END; $$;

CREATE OR REPLACE FUNCTION public.delete_audit_log(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_developer() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  DELETE FROM public.audit_logs WHERE id = _id;
END; $$;

REVOKE ALL ON FUNCTION public.delete_deduction(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_invite_link(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_notification(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_audit_log(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_deduction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_invite_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_notification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_audit_log(uuid) TO authenticated;