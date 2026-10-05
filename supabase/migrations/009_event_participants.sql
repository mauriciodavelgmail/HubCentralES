-- Participant registration, invitations and reception check-in.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS public_registration_token UUID UNIQUE DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS public_registration_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.attendance_list
  ADD COLUMN IF NOT EXISTS document TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age IS NULL OR age BETWEEN 0 AND 120),
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS registered_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS registration_source TEXT NOT NULL DEFAULT 'manual' CHECK (registration_source IN ('manual', 'csv', 'publico')),
  ADD COLUMN IF NOT EXISTS invitation_status TEXT NOT NULL DEFAULT 'pendente' CHECK (invitation_status IN ('pendente', 'enviado', 'falhou', 'ignorado')),
  ADD COLUMN IF NOT EXISTS invitation_error TEXT;

ALTER TABLE public.email_deliveries
  ADD COLUMN IF NOT EXISTS participant_id UUID REFERENCES public.attendance_list(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_attendance_participant_email ON public.attendance_list(participant_email);
CREATE INDEX IF NOT EXISTS idx_attendance_presence ON public.attendance_list(event_id, presence_confirmed);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_participant ON public.email_deliveries(participant_id);

CREATE OR REPLACE FUNCTION public.prepare_attendance_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.participant_name := trim(NEW.participant_name);
  NEW.participant_email := lower(trim(NEW.participant_email));
  NEW.participant_phone := trim(NEW.participant_phone);
  IF NEW.participant_name = '' OR COALESCE(NEW.participant_email, '') = '' OR COALESCE(NEW.participant_phone, '') = '' THEN
    RAISE EXCEPTION 'Nome, e-mail e telefone são obrigatórios.' USING ERRCODE = '23514';
  END IF;
  IF NEW.participant_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail do participante inválido.' USING ERRCODE = '23514';
  END IF;
  NEW.qr_code := COALESCE(NULLIF(NEW.qr_code, ''), uuid_generate_v4()::TEXT);
  NEW.access_link := COALESCE(NULLIF(NEW.access_link, ''), uuid_generate_v4()::TEXT);
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_attendance_participant_trigger ON public.attendance_list;
CREATE TRIGGER prepare_attendance_participant_trigger
BEFORE INSERT OR UPDATE ON public.attendance_list
FOR EACH ROW EXECUTE FUNCTION public.prepare_attendance_participant();

DROP POLICY IF EXISTS "Authorized users can view attendance" ON public.attendance_list;
DROP POLICY IF EXISTS "Authorized users can manage attendance" ON public.attendance_list;
CREATE POLICY "Event team and requester can view attendance"
ON public.attendance_list FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('administrador', 'recepcao')
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.requester_id = public.current_profile_id()
  )
);
CREATE POLICY "Event team and requester can add attendance"
ON public.attendance_list FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_role() = 'administrador'
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.requester_id = public.current_profile_id() AND e.status = 'confirmada'
  )
);
CREATE POLICY "Event team and requester can update attendance"
ON public.attendance_list FOR UPDATE TO authenticated
USING (
  public.current_user_role() IN ('administrador', 'recepcao')
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.requester_id = public.current_profile_id()
  )
)
WITH CHECK (
  public.current_user_role() IN ('administrador', 'recepcao')
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.requester_id = public.current_profile_id()
  )
);
CREATE POLICY "Administrators and requester can delete attendance"
ON public.attendance_list FOR DELETE TO authenticated
USING (
  public.current_user_role() = 'administrador'
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.requester_id = public.current_profile_id()
  )
);

DROP TRIGGER IF EXISTS audit_changes ON public.attendance_list;
CREATE TRIGGER audit_changes
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_list
FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();
