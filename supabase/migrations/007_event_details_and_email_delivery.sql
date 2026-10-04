-- Extended event request data and reliable e-mail delivery tracking.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS audience_access TEXT CHECK (audience_access IN ('publico_fechado', 'aberto_publico')),
  ADD COLUMN IF NOT EXISTS activity_sector TEXT CHECK (activity_sector IN ('sociedade_civil', 'governo')),
  ADD COLUMN IF NOT EXISTS facilitator_name TEXT,
  ADD COLUMN IF NOT EXISTS facilitator_minibio TEXT,
  ADD COLUMN IF NOT EXISTS facilitator_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS facilitator_cpf TEXT,
  ADD COLUMN IF NOT EXISTS facilitator_phone TEXT,
  ADD COLUMN IF NOT EXISTS facilitator_social TEXT,
  ADD COLUMN IF NOT EXISTS facilitator_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS facilitator_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS organizer_name TEXT,
  ADD COLUMN IF NOT EXISTS organizer_contact TEXT,
  ADD COLUMN IF NOT EXISTS interpreter_needed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS equipments TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS materials_needed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS catering_needed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS furniture_change_needed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falhou', 'ignorado')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_event ON public.email_deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status ON public.email_deliveries(status);
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administrators can view email deliveries"
ON public.email_deliveries FOR SELECT TO authenticated
USING (public.current_user_role() = 'administrador');

-- Visitors can only see their own request details. Everyone can still query
-- occupied slots through the safe calendar function below.
DROP POLICY IF EXISTS "Users can view events" ON public.events;
CREATE POLICY "Authorized users can view events"
ON public.events FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('administrador', 'administracao', 'recepcao')
  OR requester_id = public.current_profile_id()
);

CREATE OR REPLACE FUNCTION public.get_event_calendar(p_space_id UUID, p_month_start DATE, p_month_end DATE)
RETURNS TABLE (
  id UUID,
  title TEXT,
  status public.event_status,
  start_date DATE,
  start_time TIME,
  end_time TIME
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.title, e.status, e.start_date, e.start_time, e.end_time
  FROM public.events e
  WHERE auth.uid() IS NOT NULL
    AND e.space_id = p_space_id
    AND e.start_date BETWEEN p_month_start AND p_month_end
    AND e.status <> 'cancelada'
  ORDER BY e.start_date, e.start_time
$$;

GRANT EXECUTE ON FUNCTION public.get_event_calendar(UUID, DATE, DATE) TO authenticated;

