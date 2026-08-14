-- 1. Salary weeks -------------------------------------------------------
CREATE TABLE public.salary_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  week_start date NOT NULL,
  day_1 numeric NOT NULL DEFAULT 0,
  day_2 numeric NOT NULL DEFAULT 0,
  day_3 numeric NOT NULL DEFAULT 0,
  day_4 numeric NOT NULL DEFAULT 0,
  day_5 numeric NOT NULL DEFAULT 0,
  day_6 numeric NOT NULL DEFAULT 0,
  day_7 numeric NOT NULL DEFAULT 0,
  night_shift_allowance numeric NOT NULL DEFAULT 0,
  activity_bonus numeric NOT NULL DEFAULT 0,
  hiring_leader_bonus numeric NOT NULL DEFAULT 0,
  chatter_bonus numeric NOT NULL DEFAULT 0,
  deductions_back numeric NOT NULL DEFAULT 0,
  last_week_salary numeric NOT NULL DEFAULT 0,
  deduction numeric NOT NULL DEFAULT 0,
  gross_total numeric NOT NULL DEFAULT 0,
  service_fee numeric NOT NULL DEFAULT 0,
  net_total numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

GRANT SELECT ON public.salary_weeks TO authenticated;
GRANT ALL ON public.salary_weeks TO service_role;
ALTER TABLE public.salary_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_weeks_select ON public.salary_weeks
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR public.is_admin());

CREATE TRIGGER salary_weeks_touch BEFORE UPDATE ON public.salary_weeks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX salary_weeks_user_week_idx ON public.salary_weeks (user_id, week_start DESC);

-- 2. Core upsert ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_salary_week(
  _user_id uuid,
  _week_start date,
  _days numeric[],
  _night numeric,
  _activity numeric,
  _hiring numeric,
  _chatter numeric,
  _deductions_back numeric,
  _last_week numeric,
  _deduction numeric,
  _notify boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  target public.profiles;
  actor_email text;
  d numeric[] := coalesce(_days, ARRAY[0,0,0,0,0,0,0]::numeric[]);
  gross numeric; fee numeric; net numeric; new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO target FROM public.profiles WHERE id = _user_id;
  IF target IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;
  SELECT email INTO actor_email FROM public.profiles WHERE id = auth.uid();

  WHILE array_length(d, 1) IS NULL OR array_length(d, 1) < 7 LOOP
    d := d || 0::numeric;
  END LOOP;

  gross := coalesce(d[1],0)+coalesce(d[2],0)+coalesce(d[3],0)+coalesce(d[4],0)
         + coalesce(d[5],0)+coalesce(d[6],0)+coalesce(d[7],0)
         + coalesce(_night,0)+coalesce(_activity,0)+coalesce(_hiring,0)+coalesce(_chatter,0)
         + coalesce(_deductions_back,0)+coalesce(_last_week,0) - coalesce(_deduction,0);
  fee := round(gross * 0.03, 2);
  net := round(gross - fee, 2);

  INSERT INTO public.salary_weeks (
    user_id, user_email, week_start, day_1, day_2, day_3, day_4, day_5, day_6, day_7,
    night_shift_allowance, activity_bonus, hiring_leader_bonus, chatter_bonus,
    deductions_back, last_week_salary, deduction, gross_total, service_fee, net_total,
    created_by, created_by_email
  ) VALUES (
    _user_id, target.email, _week_start, d[1], d[2], d[3], d[4], d[5], d[6], d[7],
    coalesce(_night,0), coalesce(_activity,0), coalesce(_hiring,0), coalesce(_chatter,0),
    coalesce(_deductions_back,0), coalesce(_last_week,0), coalesce(_deduction,0),
    round(gross,2), fee, net, auth.uid(), actor_email
  )
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    day_1 = EXCLUDED.day_1, day_2 = EXCLUDED.day_2, day_3 = EXCLUDED.day_3,
    day_4 = EXCLUDED.day_4, day_5 = EXCLUDED.day_5, day_6 = EXCLUDED.day_6,
    day_7 = EXCLUDED.day_7,
    night_shift_allowance = EXCLUDED.night_shift_allowance,
    activity_bonus = EXCLUDED.activity_bonus,
    hiring_leader_bonus = EXCLUDED.hiring_leader_bonus,
    chatter_bonus = EXCLUDED.chatter_bonus,
    deductions_back = EXCLUDED.deductions_back,
    last_week_salary = EXCLUDED.last_week_salary,
    deduction = EXCLUDED.deduction,
    gross_total = EXCLUDED.gross_total,
    service_fee = EXCLUDED.service_fee,
    net_total = EXCLUDED.net_total,
    updated_at = now()
  RETURNING id INTO new_id;

  -- keep only the most recent 25 weeks per person
  DELETE FROM public.salary_weeks s
  WHERE s.user_id = _user_id
    AND s.id NOT IN (
      SELECT s2.id FROM public.salary_weeks s2
      WHERE s2.user_id = _user_id
      ORDER BY s2.week_start DESC
      LIMIT 25
    );

  IF _notify THEN
    INSERT INTO public.notifications (title, message, status, publish_at, requires_ack,
      audience_user_id, created_by, created_by_email, media)
    VALUES ('Your weekly salary is ready',
      'Your salary for the week of ' || to_char(_week_start, 'Mon DD, YYYY') ||
      ' is $' || to_char(net, 'FM999999990.00') ||
      ' after the 3% service fee. Open your Salary page for the full breakdown.',
      'published', now(), false, _user_id, auth.uid(), actor_email,
      jsonb_build_array(jsonb_build_object('kind','link','url','/salary','label','Open my Salary page')));
  END IF;

  PERFORM public.write_audit('salary.save','salary_week', new_id::text,
    jsonb_build_object('employee', target.email, 'week_start', _week_start, 'net', net));
  RETURN new_id;
END; $$;

-- 3. Bulk paste ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_save_salary_weeks(_week_start date, _rows jsonb, _notify boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  r jsonb; em text; uid uuid; saved int := 0; missing text[] := '{}';
  days numeric[];
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(_rows,'[]'::jsonb)) LOOP
    em := lower(trim(coalesce(r->>'email','')));
    CONTINUE WHEN em = '';
    SELECT id INTO uid FROM public.profiles WHERE email = em;
    IF uid IS NULL THEN missing := missing || em; CONTINUE; END IF;
    days := ARRAY[
      coalesce((r->'days'->>0)::numeric,0), coalesce((r->'days'->>1)::numeric,0),
      coalesce((r->'days'->>2)::numeric,0), coalesce((r->'days'->>3)::numeric,0),
      coalesce((r->'days'->>4)::numeric,0), coalesce((r->'days'->>5)::numeric,0),
      coalesce((r->'days'->>6)::numeric,0)];
    PERFORM public.save_salary_week(uid, _week_start, days,
      coalesce((r->>'night')::numeric,0), coalesce((r->>'activity')::numeric,0),
      coalesce((r->>'hiring')::numeric,0), coalesce((r->>'chatter')::numeric,0),
      coalesce((r->>'deductions_back')::numeric,0), coalesce((r->>'last_week')::numeric,0),
      coalesce((r->>'deduction')::numeric,0), _notify);
    saved := saved + 1;
  END LOOP;
  PERFORM public.write_audit('salary.bulk_save','salary_week', NULL,
    jsonb_build_object('week_start', _week_start, 'saved', saved, 'missing', to_jsonb(missing)));
  RETURN jsonb_build_object('saved', saved, 'missing', to_jsonb(missing));
END; $$;

CREATE OR REPLACE FUNCTION public.delete_salary_week(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s public.salary_weeks;
BEGIN
  IF NOT public.is_developer() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO s FROM public.salary_weeks WHERE id = _id;
  IF s IS NULL THEN RAISE EXCEPTION 'Salary record not found'; END IF;
  DELETE FROM public.salary_weeks WHERE id = _id;
  PERFORM public.write_audit('salary.delete','salary_week', _id::text,
    jsonb_build_object('employee', s.user_email, 'week_start', s.week_start));
END; $$;

REVOKE ALL ON FUNCTION public.save_salary_week(uuid, date, numeric[], numeric, numeric, numeric, numeric, numeric, numeric, numeric, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.bulk_save_salary_weeks(date, jsonb, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.delete_salary_week(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_salary_week(uuid, date, numeric[], numeric, numeric, numeric, numeric, numeric, numeric, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_save_salary_weeks(date, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_salary_week(uuid) TO authenticated;

-- 4. Deduction announcement currency fix ---------------------------------
CREATE OR REPLACE FUNCTION public.create_deduction(_user_id uuid, _amount numeric, _reason text, _date date, _notify boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            'A deduction of $' || to_char(_amount, 'FM999999990.00') || ' was recorded for ' || to_char(_date,'Mon DD, YYYY') || '. Reason: ' || _reason,
            'published', now(), true, _user_id, auth.uid(), actor_email);
  END IF;
  PERFORM public.write_audit('deduction.create','deduction', new_id::text,
    jsonb_build_object('employee', target.email, 'amount', _amount, 'reason', _reason, 'date', _date));
  RETURN new_id;
END; $function$;

-- 5. Chat: replies, attachments, reactions --------------------------------
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;

CREATE TABLE public.chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  user_id uuid NOT NULL,
  user_email text,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.chat_reactions TO authenticated;
GRANT ALL ON public.chat_reactions TO service_role;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_reactions_select ON public.chat_reactions
  FOR SELECT TO authenticated USING (public.can_access_room(room_id));
CREATE POLICY chat_reactions_insert ON public.chat_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_room(room_id));
CREATE POLICY chat_reactions_delete ON public.chat_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY attachments_select_chat ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[2] = 'chat'
    AND public.can_access_room((storage.foldername(name))[3])
  );