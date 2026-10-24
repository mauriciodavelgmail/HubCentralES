-- Allow administrators to register spaces beyond the original fixed enum.
ALTER TABLE public.spaces
  ALTER COLUMN name TYPE TEXT USING name::TEXT;

UPDATE public.spaces
SET capacity = 1
WHERE capacity IS NULL OR capacity < 1;

ALTER TABLE public.spaces
  ALTER COLUMN capacity SET NOT NULL;

ALTER TABLE public.spaces
  DROP CONSTRAINT IF EXISTS spaces_capacity_positive;
ALTER TABLE public.spaces
  ADD CONSTRAINT spaces_capacity_positive CHECK (capacity > 0);

-- The existing events.capacity column represents the expected guest count.
UPDATE public.events e
SET capacity = GREATEST(1, LEAST(COALESCE(e.capacity, 1), s.capacity))
FROM public.spaces s
WHERE e.space_id = s.id
  AND (e.capacity IS NULL OR e.capacity < 1 OR e.capacity > s.capacity);

ALTER TABLE public.events
  ALTER COLUMN capacity SET NOT NULL;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_guest_count_positive;
ALTER TABLE public.events
  ADD CONSTRAINT events_guest_count_positive CHECK (capacity > 0);

COMMENT ON COLUMN public.spaces.capacity IS
  'Lotacao maxima permitida no ambiente.';
COMMENT ON COLUMN public.events.capacity IS
  'Quantidade de convidados prevista para o evento.';

CREATE OR REPLACE FUNCTION public.validate_event_space_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  maximum_capacity INTEGER;
BEGIN
  SELECT capacity INTO maximum_capacity
  FROM public.spaces
  WHERE id = NEW.space_id;

  IF maximum_capacity IS NULL THEN
    RAISE EXCEPTION 'Ambiente sem lotacao maxima cadastrada.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.capacity IS NULL OR NEW.capacity < 1 THEN
    RAISE EXCEPTION 'Informe uma quantidade de convidados maior que zero.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.capacity > maximum_capacity THEN
    RAISE EXCEPTION
      'A quantidade de convidados (%) excede a lotacao maxima do ambiente (%).',
      NEW.capacity, maximum_capacity
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_event_space_capacity_trigger
ON public.events;
CREATE TRIGGER validate_event_space_capacity_trigger
BEFORE INSERT OR UPDATE OF space_id, capacity ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.validate_event_space_capacity();

CREATE OR REPLACE FUNCTION public.validate_space_capacity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.space_id = NEW.id
      AND e.status <> 'cancelada'
      AND e.start_date >= CURRENT_DATE
      AND e.capacity > NEW.capacity
  ) THEN
    RAISE EXCEPTION
      'A lotacao informada e menor que a quantidade de convidados de um evento futuro.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_space_capacity_change_trigger
ON public.spaces;
CREATE TRIGGER validate_space_capacity_change_trigger
BEFORE UPDATE OF capacity ON public.spaces
FOR EACH ROW
EXECUTE FUNCTION public.validate_space_capacity_change();

CREATE OR REPLACE FUNCTION public.get_weekly_space_calendar(
  p_week_start DATE,
  p_week_end DATE
)
RETURNS TABLE (
  id UUID,
  space_id UUID,
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
  SELECT
    e.id,
    e.space_id,
    e.title,
    e.status,
    e.start_date,
    e.start_time,
    e.end_time
  FROM public.events e
  WHERE auth.uid() IS NOT NULL
    AND e.start_date BETWEEN p_week_start AND p_week_end
    AND e.status <> 'cancelada'
  ORDER BY e.start_date, e.start_time
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_space_calendar(DATE, DATE)
TO authenticated;
