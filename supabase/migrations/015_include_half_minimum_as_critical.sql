-- Business rule clarification: exactly 50% of the minimum is already critical.
CREATE OR REPLACE FUNCTION public.calculate_supply_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.minimum_quantity > 0
      AND NEW.current_quantity <= (NEW.minimum_quantity * 0.5) THEN 'critico'
    WHEN NEW.minimum_quantity > 0
      AND NEW.current_quantity <= NEW.minimum_quantity THEN 'baixo'
    ELSE 'normal'
  END;
  RETURN NEW;
END;
$$;

-- Reclassify existing records. The existing threshold trigger records and
-- notifies only rows whose classification actually changes.
UPDATE public.supplies SET current_quantity = current_quantity;

