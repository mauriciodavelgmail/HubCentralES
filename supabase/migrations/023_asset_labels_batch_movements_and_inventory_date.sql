-- Last physical inventory timestamp and atomic batch asset movements.

ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS last_inventory_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.update_equipment_last_inventory_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.action = 'inventario' THEN
    UPDATE public.equipments
    SET last_inventory_at = NEW.created_at, updated_at = now()
    WHERE id = NEW.equipment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_equipment_last_inventory_at_trigger
ON public.equipment_history;

CREATE TRIGGER update_equipment_last_inventory_at_trigger
AFTER INSERT ON public.equipment_history
FOR EACH ROW
EXECUTE FUNCTION public.update_equipment_last_inventory_at();

-- Backfill assets already concluded through the inventory workflow.
UPDATE public.equipments e
SET last_inventory_at = history.last_inventory_at
FROM (
  SELECT equipment_id, max(created_at) AS last_inventory_at
  FROM public.equipment_history
  WHERE action = 'inventario'
  GROUP BY equipment_id
) history
WHERE history.equipment_id = e.id
  AND (e.last_inventory_at IS NULL OR e.last_inventory_at < history.last_inventory_at);

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
  IF public.current_user_role() NOT IN ('administrador', 'administracao') THEN
    RAISE EXCEPTION 'Usuário não autorizado para movimentação em lote.';
  END IF;
  IF COALESCE(array_length(p_equipment_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um patrimônio.';
  END IF;

  SELECT * INTO v_destination FROM public.asset_locations
  WHERE id = p_destination_location_id AND status = 'ativo';
  IF NOT FOUND THEN RAISE EXCEPTION 'Local de destino inválido ou inativo.'; END IF;
  SELECT name INTO v_floor FROM public.asset_floors WHERE id = v_destination.floor_id;

  FOR v_equipment IN
    SELECT * FROM public.equipments
    WHERE id = ANY(p_equipment_ids)
    ORDER BY id FOR UPDATE
  LOOP
    IF v_equipment.asset_location_id IS DISTINCT FROM v_destination.id THEN
      UPDATE public.equipments
      SET asset_location_id = v_destination.id, location = v_destination.name,
          floor = v_floor, updated_by = auth.uid(), updated_at = now()
      WHERE id = v_equipment.id;

      INSERT INTO public.equipment_history (
        equipment_id, action, old_status, new_status, old_location,
        new_location, old_responsible_id, new_responsible_id,
        description, changed_by, metadata
      ) VALUES (
        v_equipment.id, 'movimentacao_lote', v_equipment.status,
        v_equipment.status, v_equipment.location, v_destination.name,
        v_equipment.responsible_id, v_equipment.responsible_id,
        COALESCE(NULLIF(trim(p_description), ''), 'Movimentação patrimonial em lote'),
        auth.uid(), jsonb_build_object('batch_size', array_length(p_equipment_ids, 1))
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Todos os patrimônios selecionados já estão no local de destino.';
  END IF;

  INSERT INTO public.notifications (
    recipient_id, title, message, type, related_entity_type, action_url
  )
  SELECT user_id, 'Movimentação patrimonial em lote',
    v_count || ' patrimônio(s) foram movimentados para ' || v_destination.name || '.',
    'equipamento_movimentado', 'equipment', '/equipamentos'
  FROM public.profiles
  WHERE role IN ('administrador', 'administracao')
    AND user_id IS NOT NULL AND is_active = true AND user_id <> auth.uid();

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.move_equipments_batch(UUID[],UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_equipments_batch(UUID[],UUID,TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
