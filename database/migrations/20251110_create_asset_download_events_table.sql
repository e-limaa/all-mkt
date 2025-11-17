CREATE TABLE IF NOT EXISTS public.asset_download_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_download_events_asset_id
  ON public.asset_download_events (asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_download_events_downloaded_at
  ON public.asset_download_events (downloaded_at);

ALTER TABLE public.asset_download_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated insert download events"
  ON public.asset_download_events
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated read download events"
  ON public.asset_download_events
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
