DROP POLICY IF EXISTS "Marketing editors can view targeted users" ON public.users;

CREATE POLICY "Marketing editors can view targeted users" ON public.users
  FOR SELECT USING (
    (auth.jwt()->>'role') = 'editor_marketing'
    AND role IN ('editor_trade', 'viewer')
  );
