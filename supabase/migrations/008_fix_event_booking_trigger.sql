-- Fix event inserts on Supabase projects where uuid_nil() is installed outside
-- the public search_path. The native NULL-safe comparison needs no extension.
CREATE OR REPLACE FUNCTION public.prepare_event_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_profile UUID;
  requester_role public.user_role;
BEGIN
  SELECT id, role INTO requester_profile, requester_role
  FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    NEW.requester_id := COALESCE(NEW.requester_id, requester_profile);
    NEW.responsible_id := COALESCE(NEW.responsible_id, requester_profile);
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    NEW.status := CASE
      WHEN requester_role = 'administrador' THEN 'confirmada'::public.event_status
      ELSE 'aguardando_aprovacao'::public.event_status
    END;
    IF requester_role = 'administrador' THEN
      NEW.approved_by := requester_profile;
      NEW.approved_at := CURRENT_TIMESTAMP;
    END IF;
  ELSE
    NEW.updated_by := auth.uid();
  END IF;

  IF NEW.status <> 'cancelada' AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.space_id = NEW.space_id
      AND e.start_date = NEW.start_date
      AND e.status <> 'cancelada'
      AND (NEW.id IS NULL OR e.id <> NEW.id)
      AND NEW.start_time < e.end_time
      AND NEW.end_time > e.start_time
  ) THEN
    RAISE EXCEPTION 'O espaço já possui um evento nesse intervalo.'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

