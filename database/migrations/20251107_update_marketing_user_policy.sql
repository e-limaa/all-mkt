DROP POLICY IF EXISTS "Marketing editors can view targeted users" ON public.users;

CREATE POLICY "Marketing editors can view targeted users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.users requester
      WHERE requester.id = auth.uid() AND requester.role = 'editor_marketing'
    )
    AND role IN ('editor_trade', 'viewer')
  );
