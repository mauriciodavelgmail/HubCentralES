-- Controlled equipment maintenance workflow, warranties and scheduled alerts.

CREATE SEQUENCE IF NOT EXISTS public.equipment_maintenance_number_seq;

CREATE TABLE IF NOT EXISTS public.equipment_maintenances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_number TEXT NOT NULL UNIQUE DEFAULT (
    'MT-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' ||
    lpad(nextval('public.equipment_maintenance_number_seq')::TEXT, 8, '0')
  ),
  equipment_id UUID NOT NULL REFERENCES public.equipments(id),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'concluida')),
  opening_description TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  completion_description TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  service_type TEXT CHECK (service_type IN ('interna', 'terceirizada')),
  supplier TEXT,
  invoice_number TEXT,
  service_value NUMERIC(14,2),
  warranty_days INTEGER CHECK (warranty_days IS NULL OR warranty_days >= 0),
  warranty_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_open_maintenance
ON public.equipment_maintenances(equipment_id) WHERE status = 'aberta';
CREATE INDEX IF NOT EXISTS idx_equipment_maintenances_equipment
ON public.equipment_maintenances(equipment_id, opened_at DESC);

ALTER TABLE public.equipment_maintenances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized users can view equipment maintenances"
ON public.equipment_maintenances FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao', 'manutencao'));

CREATE TABLE IF NOT EXISTS public.equipment_maintenance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('seven_days', 'due_today')),
  maintenance_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (equipment_id, alert_type, maintenance_date)
);

CREATE TABLE IF NOT EXISTS public.equipment_maintenance_email_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID NOT NULL REFERENCES public.equipment_maintenance_alerts(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falhou', 'ignorado')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alert_id, recipient_email)
);

ALTER TABLE public.equipment_maintenance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance_email_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators can view maintenance alerts"
ON public.equipment_maintenance_alerts FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Administrators can view maintenance email deliveries"
ON public.equipment_maintenance_email_deliveries FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'));

-- Maintenance state is controlled only by workflow RPCs.
CREATE OR REPLACE FUNCTION public.protect_equipment_controlled_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'disponivel'::public.equipment_status;
    NEW.maintenance_status := 'alerta';
    NEW.is_low := false;
    NEW.low_date := NULL;
    RETURN NEW;
  END IF;
  IF COALESCE(current_setting('hub.allow_equipment_controlled_update', true), 'false') <> 'true'
     AND (NEW.status IS DISTINCT FROM OLD.status OR
       NEW.maintenance_status IS DISTINCT FROM OLD.maintenance_status OR
       NEW.asset_location_id IS DISTINCT FROM OLD.asset_location_id OR
       NEW.location IS DISTINCT FROM OLD.location OR NEW.floor IS DISTINCT FROM OLD.floor OR
       NEW.is_low IS DISTINCT FROM OLD.is_low OR NEW.low_date IS DISTINCT FROM OLD.low_date) THEN
    RAISE EXCEPTION 'Status e localização só podem ser alterados pelas operações patrimoniais.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_equipment_maintenance(
  p_equipment_id UUID, p_description TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_equipment public.equipments%ROWTYPE; v_id UUID;
BEGIN
  IF public.current_user_role() NOT IN ('administrador', 'administracao', 'manutencao') THEN RAISE EXCEPTION 'Usuário não autorizado.'; END IF;
  IF length(trim(COALESCE(p_description, ''))) < 5 THEN RAISE EXCEPTION 'Informe uma descrição com pelo menos 5 caracteres.'; END IF;
  SELECT * INTO v_equipment FROM public.equipments WHERE id = p_equipment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Equipamento não encontrado.'; END IF;
  IF v_equipment.status = 'baixado' THEN RAISE EXCEPTION 'Equipamento baixado não pode entrar em manutenção.'; END IF;
  IF EXISTS (SELECT 1 FROM public.equipment_maintenances WHERE equipment_id = p_equipment_id AND status = 'aberta') THEN RAISE EXCEPTION 'Já existe uma manutenção aberta para este equipamento.'; END IF;
  INSERT INTO public.equipment_maintenances (equipment_id, opening_description, opened_by)
  VALUES (p_equipment_id, trim(p_description), auth.uid()) RETURNING id INTO v_id;
  PERFORM set_config('hub.allow_equipment_controlled_update', 'true', true);
  UPDATE public.equipments SET status = 'em_manutencao', maintenance_status = 'alerta', updated_by = auth.uid() WHERE id = p_equipment_id;
  INSERT INTO public.equipment_history (equipment_id, action, old_status, new_status, old_location, new_location, description, changed_by, metadata)
  VALUES (p_equipment_id, 'manutencao_aberta', v_equipment.status, 'em_manutencao', v_equipment.location, v_equipment.location, trim(p_description), auth.uid(), jsonb_build_object('maintenance_id', v_id));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_equipment_maintenance(
  p_maintenance_id UUID, p_description TEXT, p_service_type TEXT,
  p_supplier TEXT DEFAULT NULL, p_invoice_number TEXT DEFAULT NULL,
  p_service_value NUMERIC DEFAULT NULL, p_warranty_days INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_maintenance public.equipment_maintenances%ROWTYPE; v_equipment public.equipments%ROWTYPE;
BEGIN
  IF public.current_user_role() NOT IN ('administrador', 'administracao', 'manutencao') THEN RAISE EXCEPTION 'Usuário não autorizado.'; END IF;
  IF length(trim(COALESCE(p_description, ''))) < 5 THEN RAISE EXCEPTION 'Descreva o serviço realizado.'; END IF;
  IF p_service_type NOT IN ('interna', 'terceirizada') THEN RAISE EXCEPTION 'Informe o tipo da manutenção.'; END IF;
  IF p_service_type = 'terceirizada' AND length(trim(COALESCE(p_supplier, ''))) < 2 THEN RAISE EXCEPTION 'Informe o fornecedor.'; END IF;
  IF p_warranty_days IS NOT NULL AND p_warranty_days < 0 THEN RAISE EXCEPTION 'Garantia inválida.'; END IF;
  SELECT * INTO v_maintenance FROM public.equipment_maintenances WHERE id = p_maintenance_id FOR UPDATE;
  IF NOT FOUND OR v_maintenance.status <> 'aberta' THEN RAISE EXCEPTION 'Manutenção aberta não encontrada.'; END IF;
  SELECT * INTO v_equipment FROM public.equipments WHERE id = v_maintenance.equipment_id FOR UPDATE;
  UPDATE public.equipment_maintenances SET status = 'concluida', completion_description = trim(p_description), completed_at = now(), completed_by = auth.uid(),
    service_type = p_service_type, supplier = CASE WHEN p_service_type = 'terceirizada' THEN NULLIF(trim(p_supplier), '') ELSE NULL END,
    invoice_number = CASE WHEN p_service_type = 'terceirizada' THEN NULLIF(trim(p_invoice_number), '') ELSE NULL END,
    service_value = CASE WHEN p_service_type = 'terceirizada' THEN p_service_value ELSE NULL END,
    warranty_days = CASE WHEN p_service_type = 'terceirizada' THEN p_warranty_days ELSE NULL END,
    warranty_end_date = CASE WHEN p_service_type = 'terceirizada' AND COALESCE(p_warranty_days, 0) > 0 THEN CURRENT_DATE + p_warranty_days ELSE NULL END,
    updated_at = now() WHERE id = p_maintenance_id;
  PERFORM set_config('hub.allow_equipment_controlled_update', 'true', true);
  UPDATE public.equipments SET status = 'disponivel', maintenance_status = 'ok', last_maintenance_date = CURRENT_DATE, updated_by = auth.uid() WHERE id = v_equipment.id;
  INSERT INTO public.equipment_history (equipment_id, action, old_status, new_status, old_location, new_location, description, changed_by, metadata)
  VALUES (v_equipment.id, 'manutencao_concluida', v_equipment.status, 'disponivel', v_equipment.location, v_equipment.location, trim(p_description), auth.uid(),
    jsonb_build_object('maintenance_id', p_maintenance_id, 'service_type', p_service_type, 'supplier', p_supplier, 'invoice_number', p_invoice_number, 'service_value', p_service_value, 'warranty_days', p_warranty_days, 'warranty_end_date', CASE WHEN COALESCE(p_warranty_days, 0) > 0 THEN CURRENT_DATE + p_warranty_days ELSE NULL END));
  RETURN v_equipment.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_equipment_maintenance_alerts(p_today DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(alert_id UUID, equipment_id UUID, alert_type TEXT, maintenance_date DATE)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('hub.allow_equipment_controlled_update', 'true', true);
  UPDATE public.equipments SET maintenance_status = 'alerta'
  WHERE status <> 'baixado' AND next_maintenance_date IS NOT NULL
    AND next_maintenance_date <= p_today + 7 AND maintenance_status <> 'alerta';
  INSERT INTO public.equipment_maintenance_alerts (equipment_id, alert_type, maintenance_date)
  SELECT id, CASE WHEN next_maintenance_date = p_today THEN 'due_today' ELSE 'seven_days' END, next_maintenance_date
  FROM public.equipments
  WHERE status <> 'baixado' AND next_maintenance_date IN (p_today, p_today + 7)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.notifications (recipient_id, title, message, type, related_entity_type, related_entity_id, action_url)
  SELECT p.user_id,
    CASE a.alert_type WHEN 'due_today' THEN 'Manutenção vence hoje' ELSE 'Manutenção em 7 dias' END,
    e.name || ' (' || e.patrimonial_code || ') — próxima manutenção em ' || to_char(a.maintenance_date, 'DD/MM/YYYY') || '.',
    'equipamento_manutencao_alerta', 'equipment', e.id, '/equipamentos?patrimonio=' || e.id::TEXT
  FROM public.equipment_maintenance_alerts a JOIN public.equipments e ON e.id = a.equipment_id
  JOIN public.profiles p ON p.role = 'administrador' AND p.is_active = true AND p.user_id IS NOT NULL
  WHERE a.created_at::DATE = p_today
    AND NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.recipient_id = p.user_id AND n.type = 'equipamento_manutencao_alerta' AND n.related_entity_id = e.id
      AND n.title = CASE a.alert_type WHEN 'due_today' THEN 'Manutenção vence hoje' ELSE 'Manutenção em 7 dias' END
      AND n.message LIKE '%' || to_char(a.maintenance_date, 'DD/MM/YYYY') || '%');
  RETURN QUERY SELECT a.id, a.equipment_id, a.alert_type, a.maintenance_date
  FROM public.equipment_maintenance_alerts a WHERE a.created_at::DATE = p_today;
END;
$$;

REVOKE ALL ON FUNCTION public.start_equipment_maintenance(UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_equipment_maintenance(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_equipment_maintenance(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_equipment_maintenance(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_equipment_maintenance_alerts(DATE) TO service_role;
NOTIFY pgrst, 'reload schema';
