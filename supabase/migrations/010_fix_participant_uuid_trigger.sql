-- Fix public participant registration when uuid-ossp lives in the
-- Supabase extensions schema and is unavailable in the trigger search_path.
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

  IF NEW.participant_name = ''
    OR COALESCE(NEW.participant_email, '') = ''
    OR COALESCE(NEW.participant_phone, '') = '' THEN
    RAISE EXCEPTION 'Nome, e-mail e telefone são obrigatórios.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.participant_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail do participante inválido.'
      USING ERRCODE = '23514';
  END IF;

  NEW.qr_code := COALESCE(NULLIF(NEW.qr_code, ''), gen_random_uuid()::TEXT);
  NEW.access_link := COALESCE(NULLIF(NEW.access_link, ''), gen_random_uuid()::TEXT);
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

