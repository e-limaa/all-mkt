DROP POLICY IF EXISTS "Trade editors can view managed users" ON public.users;

CREATE POLICY "Trade editors can view managed users" ON public.users
  FOR SELECT USING (
    created_by = auth.uid()
  );
