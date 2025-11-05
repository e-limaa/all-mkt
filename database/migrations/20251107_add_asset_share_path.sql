ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS share_path TEXT;

UPDATE public.assets
SET share_path =
  'materials?categoryType=' || category_type ||
  '&categoryId=' || category_id ||
  '&assetId=' || id ||
  CASE
    WHEN COALESCE(TRIM(category_name), '') <> '' THEN
      '&categoryName=' || replace(category_name, ' ', '%20')
    ELSE
      ''
  END
WHERE share_path IS NULL;
