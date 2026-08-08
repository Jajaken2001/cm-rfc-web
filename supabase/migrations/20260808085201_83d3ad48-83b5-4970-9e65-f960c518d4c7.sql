-- ============ enums ============
CREATE TYPE public.app_role AS ENUM ('developer','admin','moderator','user');
CREATE TYPE public.form_kind AS ENUM ('request','feedback');
CREATE TYPE public.form_status AS ENUM ('draft','published','archived');
CREATE TYPE public.submission_status AS ENUM ('pending','approved','declined','new','acknowledged');
CREATE TYPE public.notification_status AS ENUM ('draft','published','archived');

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  is_authorized boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ core helper functions ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role WHEN 'developer' THEN 1 WHEN 'admin' THEN 2 WHEN 'moderator' THEN 3 ELSE 4 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
                 AND role IN ('developer','admin','moderator'));
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
                 AND role IN ('developer','admin'));
$$;

CREATE OR REPLACE FUNCTION public.is_developer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'developer');
$$;

CREATE OR REPLACE FUNCTION public.protected_developer_email()
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT 'j.thunder0008@gmail.com'::text $$;

-- ============ profiles policies ============
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());

-- ============ audit logs ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  actor_role text,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_admin" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.write_audit(_action text, _target_type text, _target_id text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, actor_email, actor_role, action, target_type, target_id, metadata)
  VALUES (auth.uid(),
          (SELECT email FROM public.profiles WHERE id = auth.uid()),
          public.my_role()::text, _action, _target_type, _target_id, COALESCE(_metadata,'{}'::jsonb));
END; $$;

-- ============ bootstrap profile / role on sign-in ============
CREATE OR REPLACE FUNCTION public.bootstrap_profile()
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  jwt_email text := lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'email', auth.jwt() ->> 'email', ''));
  meta jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  is_dev boolean;
  prof public.profiles;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  is_dev := jwt_email = public.protected_developer_email();

  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_authorized, last_seen_at)
  VALUES (uid, jwt_email,
          coalesce(meta ->> 'full_name', meta ->> 'name'),
          coalesce(meta ->> 'avatar_url', meta ->> 'picture'),
          is_dev, now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = coalesce(EXCLUDED.avatar_url, public.profiles.avatar_url),
        is_authorized = public.profiles.is_authorized OR is_dev,
        last_seen_at = now(),
        updated_at = now()
  RETURNING * INTO prof;

  IF is_dev THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'developer') ON CONFLICT DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = uid AND role <> 'developer';
  END IF;

  RETURN prof;
END; $$;

CREATE OR REPLACE FUNCTION public.touch_presence()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

-- ============ role assignment ============
CREATE OR REPLACE FUNCTION public.assign_role(_email text, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target public.profiles;
  actor_dev boolean := public.is_developer();
  actor_admin boolean := public.is_admin();
  old_role text;
BEGIN
  IF NOT actor_admin THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO target FROM public.profiles WHERE email = lower(_email);
  IF target IS NULL THEN RAISE EXCEPTION 'No account found for %. The person must sign in with Google once first.', _email; END IF;
  IF target.id = auth.uid() THEN RAISE EXCEPTION 'You cannot change your own role'; END IF;
  IF target.email = public.protected_developer_email() THEN RAISE EXCEPTION 'The protected Developer account cannot be modified'; END IF;
  IF _role = 'developer' AND NOT actor_dev THEN RAISE EXCEPTION 'Only a Developer can assign the Developer role'; END IF;
  IF _role = 'admin' AND NOT actor_dev THEN RAISE EXCEPTION 'Only a Developer can assign the Admin role'; END IF;
  IF public.has_role(target.id, 'developer') AND NOT actor_dev THEN RAISE EXCEPTION 'Only a Developer can change a Developer'; END IF;

  SELECT string_agg(role::text, ',') INTO old_role FROM public.user_roles WHERE user_id = target.id;
  DELETE FROM public.user_roles WHERE user_id = target.id;
  INSERT INTO public.user_roles (user_id, role) VALUES (target.id, _role);
  UPDATE public.profiles SET is_authorized = true, updated_at = now() WHERE id = target.id;
  PERFORM public.write_audit('role.assign','profile', target.id::text,
    jsonb_build_object('email', target.email, 'from', old_role, 'to', _role::text));
END; $$;

CREATE OR REPLACE FUNCTION public.set_authorization(_user_id uuid, _authorized boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.profiles;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO target FROM public.profiles WHERE id = _user_id;
  IF target IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF target.email = public.protected_developer_email() THEN RAISE EXCEPTION 'The protected Developer account cannot be modified'; END IF;
  IF target.id = auth.uid() THEN RAISE EXCEPTION 'You cannot change your own access'; END IF;
  UPDATE public.profiles SET is_authorized = _authorized, updated_at = now() WHERE id = _user_id;
  IF _authorized THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  PERFORM public.write_audit(CASE WHEN _authorized THEN 'user.authorize' ELSE 'user.revoke' END,
                             'profile', _user_id::text, jsonb_build_object('email', target.email));
END; $$;

-- ============ forms ============
CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind public.form_kind NOT NULL DEFAULT 'request',
  status public.form_status NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  allow_attachments boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forms TO authenticated;
GRANT ALL ON public.forms TO service_role;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms_select" ON public.forms FOR SELECT TO authenticated
  USING (public.is_staff() OR (status = 'published' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_authorized)));
CREATE POLICY "forms_insert_staff" ON public.forms FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "forms_update_staff" ON public.forms FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ submissions ============
CREATE SEQUENCE public.submission_seq START 1;
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('REQ-' || lpad(nextval('public.submission_seq')::text, 6, '0')),
  kind public.form_kind NOT NULL,
  form_id uuid REFERENCES public.forms(id) ON DELETE SET NULL,
  form_title text NOT NULL,
  form_version integer NOT NULL DEFAULT 1,
  form_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text,
  status public.submission_status NOT NULL DEFAULT 'pending',
  response_note text,
  reviewed_by uuid,
  reviewed_by_email text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
GRANT USAGE ON SEQUENCE public.submission_seq TO authenticated, service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_select" ON public.submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());
CREATE POLICY "submissions_insert_own" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_authorized));
CREATE POLICY "submissions_update_staff" ON public.submissions FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE public.submission_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  from_status public.submission_status,
  to_status public.submission_status NOT NULL,
  note text,
  changed_by uuid,
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.submission_status_history TO authenticated;
GRANT ALL ON public.submission_status_history TO service_role;
ALTER TABLE public.submission_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ssh_select" ON public.submission_status_history FOR SELECT TO authenticated
  USING (public.is_staff() OR EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id AND s.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.review_submission(_id uuid, _status public.submission_status, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.submissions; actor_email text;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO s FROM public.submissions WHERE id = _id;
  IF s IS NULL THEN RAISE EXCEPTION 'Record not found'; END IF;
  SELECT email INTO actor_email FROM public.profiles WHERE id = auth.uid();
  UPDATE public.submissions SET status = _status,
    response_note = COALESCE(_note, response_note),
    reviewed_by = auth.uid(), reviewed_by_email = actor_email, reviewed_at = now()
  WHERE id = _id;
  INSERT INTO public.submission_status_history (submission_id, from_status, to_status, note, changed_by, changed_by_email)
  VALUES (_id, s.status, _status, _note, auth.uid(), actor_email);
  PERFORM public.write_audit('submission.' || _status::text, 'submission', s.reference,
    jsonb_build_object('kind', s.kind, 'user_email', s.user_email, 'note', _note));
END; $$;

-- ============ deductions ============
CREATE TABLE public.deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  reason text NOT NULL,
  applicable_date date NOT NULL,
  week_start date NOT NULL,
  notified boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deductions TO authenticated;
GRANT ALL ON public.deductions TO service_role;
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deductions_select" ON public.deductions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ============ notifications ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  status public.notification_status NOT NULL DEFAULT 'draft',
  publish_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  repeat_schedule text NOT NULL DEFAULT 'none',
  requires_ack boolean NOT NULL DEFAULT false,
  audience_user_id uuid,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR (status = 'published' AND publish_at <= now()
        AND (expires_at IS NULL OR expires_at > now())
        AND (audience_user_id IS NULL OR audience_user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_authorized))
  );
CREATE POLICY "notifications_insert_staff" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "notifications_update_staff" ON public.notifications FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TABLE public.notification_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);
GRANT SELECT, INSERT ON public.notification_acknowledgements TO authenticated;
GRANT ALL ON public.notification_acknowledgements TO service_role;
ALTER TABLE public.notification_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acks_select" ON public.notification_acknowledgements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());
CREATE POLICY "acks_insert_own" ON public.notification_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_deduction(_user_id uuid, _amount numeric, _reason text, _date date, _notify boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.profiles; actor_email text; new_id uuid; wk date;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO target FROM public.profiles WHERE id = _user_id;
  IF target IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;
  SELECT email INTO actor_email FROM public.profiles WHERE id = auth.uid();
  wk := date_trunc('week', _date::timestamp)::date;
  INSERT INTO public.deductions (user_id, user_email, amount, reason, applicable_date, week_start, notified, created_by, created_by_email)
  VALUES (_user_id, target.email, _amount, _reason, _date, wk, _notify, auth.uid(), actor_email)
  RETURNING id INTO new_id;
  IF _notify THEN
    INSERT INTO public.notifications (title, message, status, publish_at, requires_ack, audience_user_id, created_by, created_by_email)
    VALUES ('Salary deduction recorded',
            'A deduction of PHP ' || _amount::text || ' was recorded for ' || to_char(_date,'Mon DD, YYYY') || '. Reason: ' || _reason,
            'published', now(), true, _user_id, auth.uid(), actor_email);
  END IF;
  PERFORM public.write_audit('deduction.create','deduction', new_id::text,
    jsonb_build_object('employee', target.email, 'amount', _amount, 'reason', _reason, 'date', _date));
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.adjust_deduction(_id uuid, _amount numeric, _reason text, _date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.deductions;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO d FROM public.deductions WHERE id = _id;
  IF d IS NULL THEN RAISE EXCEPTION 'Deduction not found'; END IF;
  UPDATE public.deductions SET amount = _amount, reason = _reason, applicable_date = _date,
    week_start = date_trunc('week', _date::timestamp)::date, updated_at = now() WHERE id = _id;
  PERFORM public.write_audit('deduction.adjust','deduction', _id::text,
    jsonb_build_object('employee', d.user_email, 'from_amount', d.amount, 'to_amount', _amount, 'reason', _reason));
END; $$;

-- ============ chat ============
CREATE TABLE public.chat_rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chat_rooms TO authenticated;
GRANT ALL ON public.chat_rooms TO service_role;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_select_staff" ON public.chat_rooms FOR SELECT TO authenticated USING (public.is_staff());
INSERT INTO public.chat_rooms (id, name, description) VALUES
  ('staff','Staff Chat Room','General coordination for all staff members'),
  ('admin-mod','Admin / Moderator Room','Coordination between admins and moderators');

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text,
  sender_email text NOT NULL,
  sender_role text,
  message text NOT NULL,
  attachment jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_staff" ON public.chat_messages FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "messages_insert_staff" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND sender_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============ triggers ============
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER forms_touch BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER notifications_touch BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_submissions_user ON public.submissions(user_id);
CREATE INDEX idx_submissions_kind_status ON public.submissions(kind, status);
CREATE INDEX idx_deductions_user ON public.deductions(user_id, week_start);
CREATE INDEX idx_chat_room ON public.chat_messages(room_id, created_at);