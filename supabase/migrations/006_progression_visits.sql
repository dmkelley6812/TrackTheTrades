-- Distinct authenticated app visit days, stamped by the server. Historical
-- imports cannot manufacture app tenure, and repeated logins earn no extra XP.
CREATE TABLE IF NOT EXISTS public.app_visit_days (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT (timezone('UTC', now())::date),
  PRIMARY KEY (user_id, visit_date)
);
ALTER TABLE public.app_visit_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_visit_days_select ON public.app_visit_days
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.record_app_visit() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE days INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.app_visit_days (user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  SELECT count(*) INTO days FROM public.app_visit_days WHERE user_id = auth.uid();
  RETURN days;
END;
$$;
REVOKE ALL ON FUNCTION public.record_app_visit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_app_visit() TO authenticated;
