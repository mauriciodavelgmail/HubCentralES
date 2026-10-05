-- Automatic stock criticality, persistent realtime notifications and e-mail queue.

ALTER TABLE public.supplies
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.supply_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id UUID NOT NULL REFERENCES public.supplies(id),
  alert_level TEXT NOT NULL CHECK (alert_level IN ('baixo', 'critico')),
  current_quantity INTEGER NOT NULL,
  minimum_quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'parcial', 'falhou')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_supply_alerts_pending
ON public.supply_alerts(status, created_at);

ALTER TABLE public.supply_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Managers can view supply alerts" ON public.supply_alerts;
CREATE POLICY "Managers can view supply alerts"
ON public.supply_alerts FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'));

ALTER TABLE public.email_deliveries
  ADD COLUMN IF NOT EXISTS supply_id UUID REFERENCES public.supplies(id),
  ADD COLUMN IF NOT EXISTS supply_alert_id UUID REFERENCES public.supply_alerts(id);

CREATE OR REPLACE FUNCTION public.calculate_supply_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.minimum_quantity > 0
      AND NEW.current_quantity < (NEW.minimum_quantity * 0.5) THEN 'critico'
    WHEN NEW.minimum_quantity > 0
      AND NEW.current_quantity <= NEW.minimum_quantity THEN 'baixo'
    ELSE 'normal'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calculate_supply_status ON public.supplies;
CREATE TRIGGER calculate_supply_status
BEFORE INSERT OR UPDATE OF current_quantity, minimum_quantity ON public.supplies
FOR EACH ROW EXECUTE FUNCTION public.calculate_supply_status();

-- Normalize current data without generating notifications for historical states.
UPDATE public.supplies SET current_quantity = current_quantity;

CREATE OR REPLACE FUNCTION public.notify_supply_threshold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_id UUID;
  alert_title TEXT;
  alert_message TEXT;
BEGIN
  IF NEW.status NOT IN ('baixo', 'critico') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  alert_title := CASE WHEN NEW.status = 'critico'
    THEN 'Estoque crítico' ELSE 'Estoque baixo' END;
  alert_message := 'O insumo "' || NEW.name || '" (' || NEW.code || ') está com saldo ' ||
    NEW.current_quantity || ' ' || NEW.unit || ', para um mínimo de ' || NEW.minimum_quantity || '.';

  INSERT INTO public.supply_alerts (
    supply_id, alert_level, current_quantity, minimum_quantity
  ) VALUES (
    NEW.id, NEW.status, NEW.current_quantity, NEW.minimum_quantity
  ) RETURNING id INTO alert_id;

  INSERT INTO public.notifications (
    recipient_id, title, message, type,
    related_entity_type, related_entity_id, action_url
  )
  SELECT p.user_id, alert_title, alert_message,
    'supply_' || NEW.status, 'supply', NEW.id, '/insumos'
  FROM public.profiles p
  WHERE p.role IN ('administrador', 'administracao')
    AND p.is_active = TRUE
    AND p.user_id IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_supply_threshold ON public.supplies;
CREATE TRIGGER notify_supply_threshold
AFTER INSERT OR UPDATE OF current_quantity, minimum_quantity ON public.supplies
FOR EACH ROW EXECUTE FUNCTION public.notify_supply_threshold();

-- Only managers can deactivate stock items. They remain available for audit/history.
CREATE OR REPLACE FUNCTION public.deactivate_supplies(p_supply_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  IF public.current_user_role() NOT IN ('administrador', 'administracao') THEN
    RAISE EXCEPTION 'Somente Administrador e Administração podem desativar insumos.';
  END IF;
  UPDATE public.supplies
  SET is_active = FALSE, updated_at = now(), updated_by = auth.uid()
  WHERE id = ANY(p_supply_ids) AND is_active = TRUE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_supplies(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_supplies(UUID[]) TO authenticated;

