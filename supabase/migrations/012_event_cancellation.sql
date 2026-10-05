-- Auditable event cancellation data.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_cancelled_at ON public.events(cancelled_at)
WHERE cancelled_at IS NOT NULL;

