DROP POLICY IF EXISTS salary_weeks_select ON public.salary_weeks;
CREATE POLICY salary_weeks_select ON public.salary_weeks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS preauthorized_emails_select_all ON public.preauthorized_emails;
CREATE POLICY preauthorized_emails_select_all ON public.preauthorized_emails FOR SELECT TO authenticated USING (true);