-- Migration: Add 'tenda_vendas' to origin constraints

-- Update users table
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_material_origin_scope_check;

ALTER TABLE public.users ADD CONSTRAINT users_material_origin_scope_check
  CHECK (material_origin_scope IS NULL OR material_origin_scope IN ('house', 'ev', 'tenda_vendas'));

-- Update assets table
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_origin_check;

ALTER TABLE public.assets ADD CONSTRAINT assets_origin_check
  CHECK (origin IS NULL OR origin IN ('house', 'ev', 'tenda_vendas'));
