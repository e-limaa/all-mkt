-- Migration: create shared links table

CREATE TABLE IF NOT EXISTS public.shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER NOT NULL DEFAULT 0,
  max_downloads INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shared_links_token ON public.shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_asset_id ON public.shared_links(asset_id);

ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their shared links" ON public.shared_links;
CREATE POLICY "Users can view their shared links" ON public.shared_links
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create shared links" ON public.shared_links;
CREATE POLICY "Users can create shared links" ON public.shared_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'editor_marketing', 'editor_trade')
    )
  );

DROP POLICY IF EXISTS "Link creators and admins can manage shared links" ON public.shared_links;
CREATE POLICY "Link creators and admins can manage shared links" ON public.shared_links
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
