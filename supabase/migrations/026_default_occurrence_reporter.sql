-- Ensure every manually-created occurrence is linked to the authenticated
-- user's active profile, even when a client omits reporter_id.
CREATE OR REPLACE FUNCTION public.set_occurrence_reporter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reporter_id IS NULL THEN
    NEW.reporter_id := public.current_profile_id();
  END IF;

  IF NEW.reporter_id IS NULL THEN
    RAISE EXCEPTION 'No active profile found for the authenticated user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_occurrence_reporter_trigger ON public.occurrences;
CREATE TRIGGER set_occurrence_reporter_trigger
BEFORE INSERT ON public.occurrences
FOR EACH ROW
EXECUTE FUNCTION public.set_occurrence_reporter();
