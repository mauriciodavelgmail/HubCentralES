-- Automatic occurrence generated one day before each confirmed event.

ALTER TYPE public.occurrence_category ADD VALUE IF NOT EXISTS 'checklist_evento';

ALTER TABLE public.occurrences
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_automatic_event_checklist BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_occurrences_event_checklist_unique
ON public.occurrences(event_id)
WHERE is_automatic_event_checklist = TRUE AND event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_occurrences_event_id
ON public.occurrences(event_id);

CREATE INDEX IF NOT EXISTS idx_occurrences_space_id
ON public.occurrences(space_id);

ALTER TABLE public.email_deliveries
  ADD COLUMN IF NOT EXISTS occurrence_id UUID REFERENCES public.occurrences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_deliveries_occurrence
ON public.email_deliveries(occurrence_id);

CREATE OR REPLACE FUNCTION public.notify_automatic_event_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_automatic_event_checklist IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    title,
    message,
    type,
    related_entity_type,
    related_entity_id,
    action_url
  )
  SELECT
    p.user_id,
    'Check-list de evento disponível',
    NEW.title || ' foi aberto para verificação das pendências do evento.',
    'event_checklist_created',
    'occurrence',
    NEW.id,
    '/ocorrencias?ocorrencia=' || NEW.id::TEXT
  FROM public.profiles p
  WHERE p.is_active = TRUE
    AND p.user_id IS NOT NULL
    AND p.role IN ('administrador', 'administracao', 'manutencao', 'limpeza');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_automatic_event_checklist_trigger
ON public.occurrences;

CREATE TRIGGER notify_automatic_event_checklist_trigger
AFTER INSERT ON public.occurrences
FOR EACH ROW
EXECUTE FUNCTION public.notify_automatic_event_checklist();

-- Maintenance and cleaning need read-only access to the linked event details.
DROP POLICY IF EXISTS "Authorized users can view events" ON public.events;
CREATE POLICY "Authorized users can view events"
ON public.events FOR SELECT TO authenticated
USING (
  public.current_user_role() IN (
    'administrador',
    'administracao',
    'recepcao',
    'manutencao',
    'limpeza'
  )
  OR requester_id = public.current_profile_id()
);

