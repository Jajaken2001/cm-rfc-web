-- ============ CHAT ROOMS ============
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS allowed_roles app_role[] NOT NULL DEFAULT ARRAY['developer','admin','moderator']::app_role[],
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_reason text,
  ADD COLUMN IF NOT EXISTS hidden_by uuid,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

CREATE OR REPLACE FUNCTION public.can_access_room(_room_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_rooms r
    WHERE r.id = _room_id AND r.is_active
      AND public.my_role() = ANY (r.allowed_roles)
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_room(text) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_room(text) TO authenticated;

DROP POLICY IF EXISTS rooms_select_staff ON public.chat_rooms;
CREATE POLICY rooms_select ON public.chat_rooms FOR SELECT TO authenticated
  USING (public.is_staff() AND (public.my_role() = ANY (allowed_roles) OR public.is_developer()));

DROP POLICY IF EXISTS messages_select_staff ON public.chat_messages;
DROP POLICY IF EXISTS messages_insert_staff ON public.chat_messages;
CREATE POLICY messages_select ON public.chat_messages FOR SELECT TO authenticated
  USING (public.can_access_room(room_id));
CREATE POLICY messages_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_access_room(room_id));

INSERT INTO public.chat_rooms (id, name, description, allowed_roles, scope, is_active, sort_order) VALUES
  ('staff-all','All Staff','Developers, Admins and Moderators.', ARRAY['developer','admin','moderator']::app_role[], 'staff', true, 1),
  ('developers','Developers','Private room for Developers.', ARRAY['developer']::app_role[], 'staff', true, 2),
  ('admins','Admins','Developers and Admins.', ARRAY['developer','admin']::app_role[], 'staff', true, 3),
  ('moderators','Moderators','Developers, Admins and Moderators coordination.', ARRAY['developer','admin','moderator']::app_role[], 'staff', true, 4),
  ('global-announcements','Global Lounge','Company-wide chat for every employee. Planned, not yet launched.', ARRAY['developer','admin','moderator','user']::app_role[], 'global', false, 10),
  ('global-support','Employee Support','Direct employee-to-staff chat. Planned, not yet launched.', ARRAY['developer','admin','moderator','user']::app_role[], 'global', false, 11)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ MODERATION ============
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution_note text,
  reported_by uuid,
  reported_by_email text,
  resolved_by uuid,
  resolved_by_email text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_reports TO authenticated;
GRANT ALL ON public.moderation_reports TO service_role;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY mod_reports_select ON public.moderation_reports FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY mod_reports_insert ON public.moderation_reports FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND reported_by = auth.uid());
CREATE TRIGGER moderation_reports_touch BEFORE UPDATE ON public.moderation_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.report_message(_message_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.chat_messages; new_id uuid; actor text;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO m FROM public.chat_messages WHERE id = _message_id;
  IF m IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF NOT public.can_access_room(m.room_id) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT email INTO actor FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.moderation_reports (message_id, room_id, reason, reported_by, reported_by_email)
  VALUES (_message_id, m.room_id, _reason, auth.uid(), actor) RETURNING id INTO new_id;
  PERFORM public.write_audit('moderation.report','chat_message', _message_id::text,
    jsonb_build_object('room', m.room_id, 'reason', _reason));
  RETURN new_id;
END; $$;
REVOKE ALL ON FUNCTION public.report_message(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.report_message(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_message(_message_id uuid, _hide boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT email INTO actor FROM public.profiles WHERE id = auth.uid();
  UPDATE public.chat_messages
    SET is_hidden = _hide,
        hidden_reason = CASE WHEN _hide THEN _reason ELSE NULL END,
        hidden_by = CASE WHEN _hide THEN auth.uid() ELSE NULL END,
        hidden_at = CASE WHEN _hide THEN now() ELSE NULL END
  WHERE id = _message_id;
  PERFORM public.write_audit(CASE WHEN _hide THEN 'moderation.hide' ELSE 'moderation.restore' END,
    'chat_message', _message_id::text, jsonb_build_object('reason', _reason, 'actor', actor));
END; $$;
REVOKE ALL ON FUNCTION public.moderate_message(uuid, boolean, text) FROM public;
GRANT EXECUTE ON FUNCTION public.moderate_message(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_report(_id uuid, _status text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF _status NOT IN ('open','actioned','dismissed') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT email INTO actor FROM public.profiles WHERE id = auth.uid();
  UPDATE public.moderation_reports
    SET status = _status, resolution_note = _note, resolved_by = auth.uid(),
        resolved_by_email = actor, resolved_at = now()
  WHERE id = _id;
  PERFORM public.write_audit('moderation.resolve','moderation_report', _id::text,
    jsonb_build_object('status', _status, 'note', _note));
END; $$;
REVOKE ALL ON FUNCTION public.resolve_report(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_report(uuid, text, text) TO authenticated;

-- ============ INVITE / ACCESS LINKS ============
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  label text,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invite_links TO authenticated;
GRANT ALL ON public.invite_links TO service_role;
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY invite_links_select_admin ON public.invite_links FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER invite_links_touch BEFORE UPDATE ON public.invite_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.invite_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.invite_links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_id, user_id)
);
GRANT SELECT ON public.invite_redemptions TO authenticated;
GRANT ALL ON public.invite_redemptions TO service_role;
ALTER TABLE public.invite_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY invite_redemptions_select ON public.invite_redemptions FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.hash_invite_code(_code text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT encode(extensions.digest(_code, 'sha256'), 'hex');
$$;
REVOKE ALL ON FUNCTION public.hash_invite_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.hash_invite_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_invite_link(_label text, _expires_at timestamptz, _max_uses integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE raw text; actor text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF _max_uses IS NOT NULL AND _max_uses < 1 THEN RAISE EXCEPTION 'Uses must be at least 1'; END IF;
  raw := replace(encode(extensions.gen_random_bytes(24), 'base64'), '/', '_');
  raw := replace(replace(raw, '+', '-'), '=', '');
  SELECT email INTO actor FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.invite_links (code_hash, label, max_uses, expires_at, created_by, created_by_email)
  VALUES (public.hash_invite_code(raw), _label, _max_uses, _expires_at, auth.uid(), actor);
  PERFORM public.write_audit('invite.create','invite_link', public.hash_invite_code(raw),
    jsonb_build_object('label', _label, 'expires_at', _expires_at, 'max_uses', _max_uses));
  RETURN raw;
END; $$;
REVOKE ALL ON FUNCTION public.create_invite_link(text, timestamptz, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.create_invite_link(text, timestamptz, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_invite_link(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  UPDATE public.invite_links SET revoked = true WHERE id = _id;
  PERFORM public.write_audit('invite.revoke','invite_link', _id::text, '{}'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.revoke_invite_link(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.revoke_invite_link(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_invite_link(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE link public.invite_links; uid uuid := auth.uid(); prof public.profiles;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO link FROM public.invite_links WHERE code_hash = public.hash_invite_code(_code);
  IF link IS NULL THEN RAISE EXCEPTION 'This access link is not valid'; END IF;
  IF link.revoked THEN RAISE EXCEPTION 'This access link has been revoked'; END IF;
  IF link.expires_at IS NOT NULL AND link.expires_at <= now() THEN RAISE EXCEPTION 'This access link has expired'; END IF;
  IF link.max_uses IS NOT NULL AND link.used_count >= link.max_uses THEN RAISE EXCEPTION 'This access link has reached its usage limit'; END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF prof IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;

  IF EXISTS (SELECT 1 FROM public.invite_redemptions WHERE invite_id = link.id AND user_id = uid) THEN
    RETURN 'already';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN
    INSERT INTO public.invite_redemptions (invite_id, user_id, user_email) VALUES (link.id, uid, prof.email);
    UPDATE public.invite_links SET used_count = used_count + 1 WHERE id = link.id;
    UPDATE public.profiles SET is_authorized = true, updated_at = now() WHERE id = uid;
    RETURN 'ok';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'user') ON CONFLICT DO NOTHING;
  UPDATE public.profiles SET is_authorized = true, updated_at = now() WHERE id = uid;
  INSERT INTO public.invite_redemptions (invite_id, user_id, user_email) VALUES (link.id, uid, prof.email);
  UPDATE public.invite_links SET used_count = used_count + 1 WHERE id = link.id;
  PERFORM public.write_audit('invite.redeem','invite_link', link.id::text,
    jsonb_build_object('email', prof.email));
  RETURN 'ok';
END; $$;
REVOKE ALL ON FUNCTION public.redeem_invite_link(text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_invite_link(text) TO authenticated;

-- ============ LANDING PAGE CONTENT (CMS) ============
CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_content_read ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY site_content_write ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.is_developer());
CREATE POLICY site_content_update ON public.site_content FOR UPDATE TO authenticated
  USING (public.is_developer()) WITH CHECK (public.is_developer());
CREATE TRIGGER site_content_touch BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.site_content (key, value) VALUES
 ('landing', jsonb_build_object(
    'eyebrow', 'Internal portal',
    'headline', 'Requests, feedback and payroll notices in one place',
    'subheadline', 'A single, auditable workspace where employees raise requests, share feedback and track salary deductions — and where management responds with a clear record.',
    'primaryCtaLabel', 'Sign in with Google',
    'secondaryCtaLabel', 'Privacy Policy',
    'featuresTitle', 'Everything the team needs',
    'features', jsonb_build_array(
      jsonb_build_object('title','Requests','body','Submit structured requests and follow every status change with a reference number.'),
      jsonb_build_object('title','Feedback','body','Share feedback through forms built by management, with optional attachments.'),
      jsonb_build_object('title','Official updates','body','Read company announcements and acknowledge the ones that require it.'),
      jsonb_build_object('title','Deductions','body','See salary deductions grouped by week, with the reason recorded.')
    ),
    'footerNote', 'Access is granted by the management team. Sign in to request access.'
  ))
ON CONFLICT (key) DO NOTHING;

-- ============ ANNOUNCEMENT BANNERS ============
CREATE TABLE IF NOT EXISTS public.site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  link_url text,
  link_label text,
  variant text NOT NULL DEFAULT 'info',
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_banners TO authenticated;
GRANT ALL ON public.site_banners TO service_role;
ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY banners_read ON public.site_banners FOR SELECT TO anon, authenticated
  USING (public.is_developer() OR (is_active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())));
CREATE POLICY banners_insert ON public.site_banners FOR INSERT TO authenticated WITH CHECK (public.is_developer());
CREATE POLICY banners_update ON public.site_banners FOR UPDATE TO authenticated
  USING (public.is_developer()) WITH CHECK (public.is_developer());
CREATE POLICY banners_delete ON public.site_banners FOR DELETE TO authenticated USING (public.is_developer());
CREATE TRIGGER site_banners_touch BEFORE UPDATE ON public.site_banners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();