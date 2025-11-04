-- Add origin scope column for users and backfill trade editors

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS material_origin_scope text CHECK (material_origin_scope in ('house', 'ev'));

UPDATE public.users
SET material_origin_scope = 'house'
WHERE role = 'editor_trade'
  AND COALESCE(NULLIF(trim(material_origin_scope), ''), '') = '';

UPDATE public.users
SET material_origin_scope = lower(material_origin_scope)
WHERE material_origin_scope IS NOT NULL;
