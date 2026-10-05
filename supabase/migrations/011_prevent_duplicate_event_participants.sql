-- Prevent duplicate registration in the same event by e-mail, document or phone.
-- Existing duplicate rows are preserved; new duplicates and conflicting edits are blocked.
CREATE OR REPLACE FUNCTION public.prepare_attendance_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_document TEXT;
  normalized_phone TEXT;
BEGIN
  NEW.participant_name := trim(NEW.participant_name);
  NEW.participant_email := lower(trim(NEW.participant_email));
  normalized_document := regexp_replace(COALESCE(NEW.document, ''), '[^0-9A-Za-z]', '', 'g');
  normalized_phone := regexp_replace(COALESCE(NEW.participant_phone, ''), '[^0-9]', '', 'g');
  NEW.document := NULLIF(normalized_document, '');
  NEW.participant_phone := normalized_phone;

  IF NEW.participant_name = '' OR COALESCE(NEW.participant_email, '') = '' OR NEW.participant_phone = '' THEN
    RAISE EXCEPTION 'Nome, e-mail e telefone são obrigatórios.' USING ERRCODE = '23514';
  END IF;
  IF NEW.participant_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail do participante inválido.' USING ERRCODE = '23514';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.event_id::TEXT, 0));

  IF EXISTS (
    SELECT 1 FROM public.attendance_list a
    WHERE a.event_id = NEW.event_id AND (NEW.id IS NULL OR a.id <> NEW.id)
      AND lower(trim(a.participant_email)) = NEW.participant_email
  ) THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado neste evento.'
      USING ERRCODE = '23505', CONSTRAINT = 'attendance_event_email_unique';
  END IF;

  IF NEW.document IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.attendance_list a
    WHERE a.event_id = NEW.event_id AND (NEW.id IS NULL OR a.id <> NEW.id)
      AND regexp_replace(COALESCE(a.document, ''), '[^0-9A-Za-z]', '', 'g') = NEW.document
  ) THEN
    RAISE EXCEPTION 'Este documento já está cadastrado neste evento.'
      USING ERRCODE = '23505', CONSTRAINT = 'attendance_event_document_unique';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance_list a
    WHERE a.event_id = NEW.event_id AND (NEW.id IS NULL OR a.id <> NEW.id)
      AND regexp_replace(COALESCE(a.participant_phone, ''), '[^0-9]', '', 'g') = NEW.participant_phone
  ) THEN
    RAISE EXCEPTION 'Este telefone já está cadastrado neste evento.'
      USING ERRCODE = '23505', CONSTRAINT = 'attendance_event_phone_unique';
  END IF;

  NEW.qr_code := COALESCE(NULLIF(NEW.qr_code, ''), gen_random_uuid()::TEXT);
  NEW.access_link := COALESCE(NULLIF(NEW.access_link, ''), gen_random_uuid()::TEXT);
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

