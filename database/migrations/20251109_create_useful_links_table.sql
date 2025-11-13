-- Migration: create useful links table and access policies

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'useful_link_category'
  ) THEN
    CREATE TYPE useful_link_category AS ENUM ('documentation', 'tools', 'resources', 'other');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.useful_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category useful_link_category NOT NULL DEFAULT 'other',
  pinned BOOLEAN NOT NULL DEFAULT false,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_useful_links_category ON public.useful_links(category);
CREATE INDEX IF NOT EXISTS idx_useful_links_created_by ON public.useful_links(created_by);

ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view useful links" ON public.useful_links;
CREATE POLICY "Users can view useful links" ON public.useful_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Editors and admins can create useful links" ON public.useful_links;
CREATE POLICY "Editors and admins can create useful links" ON public.useful_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'editor_marketing', 'editor_trade')
    )
  );

DROP POLICY IF EXISTS "Link owners and admins can update useful links" ON public.useful_links;
CREATE POLICY "Link owners and admins can update useful links" ON public.useful_links
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Link owners and admins can delete useful links" ON public.useful_links;
CREATE POLICY "Link owners and admins can delete useful links" ON public.useful_links
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
