-- Migration: ensure new regional/origin columns and updated roles

-- Rename legacy editor role to editor_marketing (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'editor'
  ) THEN
    ALTER TYPE user_role RENAME VALUE 'editor' TO 'editor_marketing';
  END IF;
END
$$;

-- Ensure the new editor_trade role exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'editor_trade'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'editor_trade';
  END IF;
END
$$;

-- Users table adjustments
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS regional text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS viewer_access_to_all boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users (id) ON DELETE SET NULL;

-- Campaigns regional column
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS regional text;

UPDATE public.campaigns
  SET regional = COALESCE(regional, 'GLOBAL');

ALTER TABLE public.campaigns
  ALTER COLUMN regional SET NOT NULL;

-- Projects regional column
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS launch_date date;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS regional text;

UPDATE public.projects
  SET regional = COALESCE(regional, 'GLOBAL');

ALTER TABLE public.projects
  ALTER COLUMN regional SET NOT NULL;

-- Assets origin/regional columns
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS origin text;

UPDATE public.assets
  SET origin = COALESCE(origin, 'house');

ALTER TABLE public.assets
  ALTER COLUMN origin SET NOT NULL;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS regional text;

UPDATE public.assets a
SET regional = COALESCE(
  a.regional,
  (
    SELECT upper(p.regional)
    FROM public.projects p
    WHERE a.category_type = 'project'::category_type
      AND a.category_id = p.id
  ),
  (
    SELECT upper(c.regional)
    FROM public.campaigns c
    WHERE a.category_type = 'campaign'::category_type
      AND a.category_id = c.id
  ),
  'GLOBAL'
);

ALTER TABLE public.assets
  ALTER COLUMN regional SET NOT NULL;

-- Normalize stored values to uppercase for consistency
UPDATE public.campaigns SET regional = upper(regional);
UPDATE public.projects SET regional = upper(regional);
UPDATE public.assets SET regional = upper(regional);
UPDATE public.users SET regional = upper(regional);

-- Drop temporary defaults if they were created implicitly
ALTER TABLE public.campaigns ALTER COLUMN regional DROP DEFAULT;
ALTER TABLE public.projects ALTER COLUMN regional DROP DEFAULT;
ALTER TABLE public.assets ALTER COLUMN regional DROP DEFAULT;
