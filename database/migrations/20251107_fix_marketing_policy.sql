CREATE OR REPLACE FUNCTION public.is_editor_marketing()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND role = 'editor_marketing'
  );
$$;

DROP POLICY IF EXISTS "Marketing editors can view targeted users" ON public.users;

CREATE POLICY "Marketing editors can view targeted users" ON public.users
  FOR SELECT USING (
    public.is_editor_marketing()
    AND role IN ('editor_trade', 'viewer')
  );
