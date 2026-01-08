-- Remove upload permission for editor_trade
DROP POLICY IF EXISTS "Authorized users can upload assets" ON public.assets;

CREATE POLICY "Authorized users can upload assets" ON public.assets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'editor_marketing')
    )
  );

-- Remove update (edit) permission for editor_trade
DROP POLICY IF EXISTS "Asset owners and admins can update assets" ON public.assets;

CREATE POLICY "Asset owners and admins can update assets" ON public.assets
  FOR UPDATE USING (
    (
        uploaded_by = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role != 'editor_trade'
        )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
