-- Atomic and auditable batch asset retirement.

CREATE OR REPLACE FUNCTION public.retire_equipments_batch(
  p_equipment_ids UUID[],
  p_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipment public.equipments%ROWTYPE;
  v_count INTEGER := 0;
BEGIN
  IF public.current_user_role() NOT IN ('administrador', 'administracao') THEN
    RAISE EXCEPTION 'Usuário não autorizado para baixa em lote.';
  END IF;
  IF COALESCE(array_length(p_equipment_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um patrimônio disponível.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'Informe o motivo da baixa com pelo menos 5 caracteres.';
  END IF;
  IF (SELECT count(*) FROM public.equipments WHERE id = ANY(p_equipment_ids)) <> array_length(p_equipment_ids, 1) THEN
    RAISE EXCEPTION 'Um ou mais patrimônios selecionados não foram encontrados.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.equipments WHERE id = ANY(p_equipment_ids) AND status = 'baixado') THEN
    RAISE EXCEPTION 'A seleção contém patrimônio já baixado.';
  END IF;

  PERFORM set_config('hub.allow_equipment_controlled_update', 'true', true);
  FOR v_equipment IN
    SELECT * FROM public.equipments
    WHERE id = ANY(p_equipment_ids)
    ORDER BY id FOR UPDATE
  LOOP
    UPDATE public.equipments
    SET status = 'baixado', is_low = true, low_date = CURRENT_DATE,
        updated_by = auth.uid(), updated_at = now()
    WHERE id = v_equipment.id;

    INSERT INTO public.equipment_history (
      equipment_id, action, old_status, new_status, old_location,
      new_location, old_responsible_id, new_responsible_id,
      description, changed_by, metadata
    ) VALUES (
      v_equipment.id, 'baixa_lote', v_equipment.status, 'baixado',
      v_equipment.location, v_equipment.location, v_equipment.responsible_id,
      v_equipment.responsible_id, trim(p_reason), auth.uid(),
      jsonb_build_object('batch_size', array_length(p_equipment_ids, 1), 'low_date', CURRENT_DATE)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- The controlled-fields trigger introduced in migration 030 also applies to
-- batch movements, so the existing RPC must explicitly authorize its update.
CREATE OR REPLACE FUNCTION public.move_equipments_batch(
  p_equipment_ids UUID[],
  p_destination_location_id UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_destination public.asset_locations%ROWTYPE;
  v_floor TEXT;
  v_equipment public.equipments%ROWTYPE;
  v_count INTEGER := 0;
BEGIN
  IF public.current_user_role() NOT IN ('administrador', 'administracao') THEN RAISE EXCEPTION 'Usuário não autorizado para movimentação em lote.'; END IF;
  IF COALESCE(array_length(p_equipment_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um patrimônio.'; END IF;
  IF EXISTS (SELECT 1 FROM public.equipments WHERE id = ANY(p_equipment_ids) AND status = 'baixado') THEN RAISE EXCEPTION 'Patrimônios baixados não podem ser movimentados.'; END IF;
  SELECT * INTO v_destination FROM public.asset_locations WHERE id = p_destination_location_id AND status = 'ativo';
  IF NOT FOUND THEN RAISE EXCEPTION 'Local de destino inválido ou inativo.'; END IF;
  SELECT name INTO v_floor FROM public.asset_floors WHERE id = v_destination.floor_id;
  PERFORM set_config('hub.allow_equipment_controlled_update', 'true', true);
  FOR v_equipment IN SELECT * FROM public.equipments WHERE id = ANY(p_equipment_ids) ORDER BY id FOR UPDATE
  LOOP
    IF v_equipment.asset_location_id IS DISTINCT FROM v_destination.id THEN
      UPDATE public.equipments SET asset_location_id = v_destination.id, location = v_destination.name,
        floor = v_floor, updated_by = auth.uid(), updated_at = now() WHERE id = v_equipment.id;
      INSERT INTO public.equipment_history (equipment_id, action, old_status, new_status, old_location, new_location, old_responsible_id, new_responsible_id, description, changed_by, metadata)
      VALUES (v_equipment.id, 'movimentacao_lote', v_equipment.status, v_equipment.status, v_equipment.location, v_destination.name,
        v_equipment.responsible_id, v_equipment.responsible_id, COALESCE(NULLIF(trim(p_description), ''), 'Movimentação patrimonial em lote'),
        auth.uid(), jsonb_build_object('batch_size', array_length(p_equipment_ids, 1)));
      v_count := v_count + 1;
    END IF;
  END LOOP;
  IF v_count = 0 THEN RAISE EXCEPTION 'Todos os patrimônios selecionados já estão no local de destino.'; END IF;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.retire_equipments_batch(UUID[],TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retire_equipments_batch(UUID[],TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
