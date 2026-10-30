-- Controlled asset location/status changes and auditable retirement workflow.

CREATE OR REPLACE FUNCTION public.protect_equipment_controlled_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'disponivel'::public.equipment_status;
    NEW.is_low := false;
    NEW.low_date := NULL;
    RETURN NEW;
  END IF;

  IF COALESCE(current_setting('hub.allow_equipment_controlled_update', true), 'false') <> 'true'
     AND (
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.asset_location_id IS DISTINCT FROM OLD.asset_location_id OR
       NEW.location IS DISTINCT FROM OLD.location OR
       NEW.floor IS DISTINCT FROM OLD.floor OR
       NEW.is_low IS DISTINCT FROM OLD.is_low OR
       NEW.low_date IS DISTINCT FROM OLD.low_date
     ) THEN
    RAISE EXCEPTION 'Status, pavimento e local só podem ser alterados pelas operações de movimentação ou baixa.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_equipment_controlled_fields_trigger ON public.equipments;
CREATE TRIGGER protect_equipment_controlled_fields_trigger
BEFORE INSERT OR UPDATE ON public.equipments
FOR EACH ROW EXECUTE FUNCTION public.protect_equipment_controlled_fields();

CREATE OR REPLACE FUNCTION public.prevent_equipment_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Patrimônios não podem ser excluídos. Utilize a operação de baixa para preservar o histórico.';
END;
$$;

DROP TRIGGER IF EXISTS prevent_equipment_deletion_trigger ON public.equipments;
CREATE TRIGGER prevent_equipment_deletion_trigger
BEFORE DELETE ON public.equipments
FOR EACH ROW EXECUTE FUNCTION public.prevent_equipment_deletion();

CREATE OR REPLACE FUNCTION public.move_equipment(
  p_equipment_id UUID, p_destination TEXT, p_description TEXT DEFAULT NULL,
  p_invoice_number TEXT DEFAULT NULL, p_invoice_url TEXT DEFAULT NULL,
  p_invoice_path TEXT DEFAULT NULL, p_image_url TEXT DEFAULT NULL,
  p_image_path TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_equipment public.equipments%ROWTYPE; v_destination public.asset_locations%ROWTYPE; v_history UUID; v_floor TEXT;
BEGIN
  IF public.current_user_role() NOT IN ('administrador', 'administracao') THEN RAISE EXCEPTION 'Usuário não autorizado.'; END IF;
  SELECT * INTO v_equipment FROM public.equipments WHERE id = p_equipment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patrimônio não encontrado.'; END IF;
  IF v_equipment.status = 'baixado' THEN RAISE EXCEPTION 'Um patrimônio baixado não pode ser movimentado.'; END IF;
  SELECT * INTO v_destination FROM public.asset_locations
  WHERE id::TEXT = p_destination OR lower(name) = lower(trim(p_destination)) ORDER BY (id::TEXT = p_destination) DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selecione um local de destino cadastrado.'; END IF;
  IF v_equipment.asset_location_id = v_destination.id THEN RAISE EXCEPTION 'O destino deve ser diferente do local atual.'; END IF;
  SELECT name INTO v_floor FROM public.asset_floors WHERE id = v_destination.floor_id;
  PERFORM set_config('hub.allow_equipment_controlled_update', 'true', true);
  UPDATE public.equipments SET asset_location_id = v_destination.id, location = v_destination.name, floor = v_floor,
    updated_by = auth.uid(), image_url = COALESCE(p_image_url, image_url), image_path = COALESCE(p_image_path, image_path),
    invoice_number = COALESCE(NULLIF(trim(p_invoice_number), ''), invoice_number), invoice_url = COALESCE(p_invoice_url, invoice_url), invoice_path = COALESCE(p_invoice_path, invoice_path)
  WHERE id = p_equipment_id;
  INSERT INTO public.equipment_history (equipment_id, action, old_status, new_status, old_location, new_location, old_responsible_id, new_responsible_id, description, changed_by, invoice_number, invoice_url, invoice_path, image_url, image_path)
  VALUES (v_equipment.id, 'movimentacao', v_equipment.status, v_equipment.status, v_equipment.location, v_destination.name, v_equipment.responsible_id, v_equipment.responsible_id, NULLIF(trim(p_description), ''), auth.uid(), NULLIF(trim(p_invoice_number), ''), p_invoice_url, p_invoice_path, p_image_url, p_image_path)
  RETURNING id INTO v_history;
  INSERT INTO public.notifications (recipient_id, title, message, type, related_entity_type, related_entity_id, action_url)
  SELECT user_id, 'Patrimônio movimentado', v_equipment.name || ' foi movimentado para ' || v_destination.name || '.', 'equipamento_movimentado', 'equipment', v_equipment.id, '/equipamentos?patrimonio=' || v_equipment.id::TEXT
  FROM public.profiles WHERE role IN ('administrador', 'administracao') AND user_id IS NOT NULL AND is_active = true AND user_id <> auth.uid();
  RETURN v_history;
END;
$$;

CREATE OR REPLACE FUNCTION public.retire_equipment(p_equipment_id UUID, p_reason TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_equipment public.equipments%ROWTYPE; v_history UUID;
BEGIN
  IF public.current_user_role() NOT IN ('administrador', 'administracao') THEN RAISE EXCEPTION 'Usuário não autorizado para baixar patrimônios.'; END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'Informe o motivo da baixa com pelo menos 5 caracteres.'; END IF;
  SELECT * INTO v_equipment FROM public.equipments WHERE id = p_equipment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patrimônio não encontrado.'; END IF;
  IF v_equipment.status = 'baixado' THEN RAISE EXCEPTION 'Este patrimônio já está baixado.'; END IF;
  PERFORM set_config('hub.allow_equipment_controlled_update', 'true', true);
  UPDATE public.equipments SET status = 'baixado', is_low = true, low_date = CURRENT_DATE,
    updated_by = auth.uid() WHERE id = p_equipment_id;
  INSERT INTO public.equipment_history (equipment_id, action, old_status, new_status, old_location, new_location, old_responsible_id, new_responsible_id, description, changed_by, metadata)
  VALUES (v_equipment.id, 'baixa', v_equipment.status, 'baixado', v_equipment.location, v_equipment.location, v_equipment.responsible_id, v_equipment.responsible_id, trim(p_reason), auth.uid(), jsonb_build_object('low_date', CURRENT_DATE))
  RETURNING id INTO v_history;
  RETURN v_history;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_equipment_retirement(p_equipment_id UUID, p_reason TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_equipment public.equipments%ROWTYPE; v_history UUID;
BEGIN
  IF public.current_user_role() NOT IN ('administrador', 'administracao') THEN RAISE EXCEPTION 'Usuário não autorizado para cancelar baixas.'; END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'Informe o motivo do cancelamento com pelo menos 5 caracteres.'; END IF;
  SELECT * INTO v_equipment FROM public.equipments WHERE id = p_equipment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patrimônio não encontrado.'; END IF;
  IF v_equipment.status <> 'baixado' THEN RAISE EXCEPTION 'Este patrimônio não possui uma baixa ativa.'; END IF;
  PERFORM set_config('hub.allow_equipment_controlled_update', 'true', true);
  UPDATE public.equipments SET status = 'disponivel', is_low = false, low_date = NULL,
    updated_by = auth.uid() WHERE id = p_equipment_id;
  INSERT INTO public.equipment_history (equipment_id, action, old_status, new_status, old_location, new_location, old_responsible_id, new_responsible_id, description, changed_by, metadata)
  VALUES (v_equipment.id, 'cancelamento_baixa', 'baixado', 'disponivel', v_equipment.location, v_equipment.location, v_equipment.responsible_id, v_equipment.responsible_id, trim(p_reason), auth.uid(), jsonb_build_object('original_low_date', v_equipment.low_date))
  RETURNING id INTO v_history;
  RETURN v_history;
END;
$$;

REVOKE ALL ON FUNCTION public.retire_equipment(UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_equipment_retirement(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retire_equipment(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_equipment_retirement(UUID,TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
