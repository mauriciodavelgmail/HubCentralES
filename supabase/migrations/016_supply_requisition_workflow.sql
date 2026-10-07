-- Normalized supply requisitions, storage locations and inventory item photos.

CREATE TABLE IF NOT EXISTS public.supply_storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.supplies
  ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES public.supply_storage_locations(id),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT;

-- Remove the legacy status trigger, which classified every quantity below the
-- minimum as merely low and overrode the current 50%-criticality rule.
DROP TRIGGER IF EXISTS update_supply_status_trigger ON public.supplies;
DROP FUNCTION IF EXISTS public.update_supply_status();
UPDATE public.supplies SET current_quantity = current_quantity;

ALTER TABLE public.supply_requisitions
  ADD COLUMN IF NOT EXISTS occurrence_id UUID REFERENCES public.occurrences(id),
  ADD COLUMN IF NOT EXISTS observation TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.supply_requisitions
  ALTER COLUMN supplies_requested SET DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.supply_requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES public.supply_requisitions(id),
  supply_id UUID NOT NULL REFERENCES public.supplies(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  quantity_fulfilled INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requisition_id, supply_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supply_movements_requisition_fk') THEN
    ALTER TABLE public.supply_movements
      ADD CONSTRAINT supply_movements_requisition_fk
      FOREIGN KEY (requisition_id) REFERENCES public.supply_requisitions(id) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supply_requisition_items_requisition
ON public.supply_requisition_items(requisition_id);
CREATE INDEX IF NOT EXISTS idx_supply_requisition_items_supply
ON public.supply_requisition_items(supply_id);

ALTER TABLE public.supply_storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_requisition_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view storage locations" ON public.supply_storage_locations;
CREATE POLICY "Authenticated users can view storage locations"
ON public.supply_storage_locations FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "Managers can create storage locations" ON public.supply_storage_locations;
CREATE POLICY "Managers can create storage locations"
ON public.supply_storage_locations FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));
DROP POLICY IF EXISTS "Managers can update storage locations" ON public.supply_storage_locations;
CREATE POLICY "Managers can update storage locations"
ON public.supply_storage_locations FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));

DROP POLICY IF EXISTS "Users can view requisition items" ON public.supply_requisition_items;
CREATE POLICY "Users can view requisition items"
ON public.supply_requisition_items FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('administrador', 'administracao')
  OR EXISTS (
    SELECT 1 FROM public.supply_requisitions r
    WHERE r.id = requisition_id AND r.requested_by = public.current_profile_id()
  )
);

DROP POLICY IF EXISTS "Authorized users can view supply requisitions" ON public.supply_requisitions;
CREATE POLICY "Users can view relevant supply requisitions"
ON public.supply_requisitions FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('administrador', 'administracao')
  OR requested_by = public.current_profile_id()
);
DROP POLICY IF EXISTS "Maintenance can request supplies" ON public.supply_requisitions;
DROP POLICY IF EXISTS "Administration can approve supply requisitions" ON public.supply_requisitions;

CREATE SEQUENCE IF NOT EXISTS public.supply_requisition_number_seq START 1;

CREATE OR REPLACE FUNCTION public.create_supply_requisition(
  p_items JSONB,
  p_observation TEXT DEFAULT NULL,
  p_occurrence_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_profile UUID;
  requisition_id UUID;
  requisition_code TEXT;
  item JSONB;
  supply_row public.supplies%ROWTYPE;
  item_quantity INTEGER;
BEGIN
  SELECT id INTO actor_profile FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = TRUE;
  IF actor_profile IS NULL THEN RAISE EXCEPTION 'Perfil ativo não encontrado.'; END IF;
  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Adicione pelo menos um insumo.';
  END IF;
  IF p_occurrence_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.occurrences WHERE id = p_occurrence_id
  ) THEN RAISE EXCEPTION 'Ocorrência não encontrada.'; END IF;

  requisition_code := 'RQ' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' ||
    lpad(nextval('public.supply_requisition_number_seq')::text, 5, '0');
  INSERT INTO public.supply_requisitions (
    requisition_number, requested_by, approval_status, supplies_requested,
    justification, observation, occurrence_id
  ) VALUES (
    requisition_code, actor_profile, 'pendente_baixa', p_items,
    NULLIF(trim(p_observation), ''), NULLIF(trim(p_observation), ''), p_occurrence_id
  ) RETURNING id INTO requisition_id;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    item_quantity := COALESCE((item->>'quantity')::integer, 0);
    SELECT * INTO supply_row FROM public.supplies
    WHERE id = (item->>'supply_id')::uuid AND is_active = TRUE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insumo indisponível.'; END IF;
    IF item_quantity <= 0 THEN RAISE EXCEPTION 'Informe quantidades válidas.'; END IF;
    INSERT INTO public.supply_requisition_items (requisition_id, supply_id, quantity)
    VALUES (requisition_id, supply_row.id, item_quantity);
  END LOOP;

  INSERT INTO public.notifications (
    recipient_id, title, message, type, related_entity_type,
    related_entity_id, action_url
  )
  SELECT p.user_id, 'Nova requisição de insumos',
    'A requisição ' || requisition_code || ' aguarda confirmação de baixa.',
    'supply_requisition_created', 'supply_requisition', requisition_id,
    '/insumos?fila=requisicoes'
  FROM public.profiles p
  WHERE p.role IN ('administrador', 'administracao')
    AND p.is_active = TRUE AND p.user_id IS NOT NULL
    AND p.id <> actor_profile;

  RETURN requisition_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_supply_requisition(
  p_requisition_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_profile UUID;
  actor_role public.user_role;
  requisition_row public.supply_requisitions%ROWTYPE;
  item RECORD;
  supply_row public.supplies%ROWTYPE;
  new_balance INTEGER;
  requester_user UUID;
BEGIN
  SELECT id, role INTO actor_profile, actor_role FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = TRUE;
  IF actor_role NOT IN ('administrador', 'administracao') THEN
    RAISE EXCEPTION 'Apenas Administrador e Administração podem processar baixas.';
  END IF;
  IF p_action NOT IN ('confirmar', 'rejeitar') THEN RAISE EXCEPTION 'Ação inválida.'; END IF;
  IF p_action = 'rejeitar' AND length(trim(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'Informe o motivo da rejeição.';
  END IF;

  SELECT * INTO requisition_row FROM public.supply_requisitions
  WHERE id = p_requisition_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisição não encontrada.'; END IF;
  IF requisition_row.approval_status <> 'pendente_baixa' THEN
    RAISE EXCEPTION 'Esta requisição já foi processada.';
  END IF;

  IF p_action = 'confirmar' THEN
    FOR item IN SELECT * FROM public.supply_requisition_items
      WHERE requisition_id = p_requisition_id
    LOOP
      SELECT * INTO supply_row FROM public.supplies WHERE id = item.supply_id FOR UPDATE;
      IF supply_row.current_quantity < item.quantity THEN
        RAISE EXCEPTION 'Saldo insuficiente para o insumo % (disponível: %, solicitado: %).',
          supply_row.code, supply_row.current_quantity, item.quantity;
      END IF;
      new_balance := supply_row.current_quantity - item.quantity;
      UPDATE public.supplies SET current_quantity = new_balance,
        updated_at = now(), updated_by = auth.uid() WHERE id = item.supply_id;
      UPDATE public.supply_requisition_items SET quantity_fulfilled = item.quantity
      WHERE id = item.id;
      INSERT INTO public.supply_movements (
        supply_id, movement_type, quantity_moved, reason, requisition_id,
        requested_by, approved_by, created_by, operation_type,
        balance_before, balance_after, metadata
      ) VALUES (
        item.supply_id, 'saida', item.quantity,
        'Baixa confirmada pela requisição ' || requisition_row.requisition_number,
        p_requisition_id, requisition_row.requested_by, actor_profile, auth.uid(),
        'requisicao_baixada', supply_row.current_quantity, new_balance,
        jsonb_build_object('requisition_number', requisition_row.requisition_number)
      );
    END LOOP;
  END IF;

  UPDATE public.supply_requisitions SET
    approval_status = CASE WHEN p_action = 'confirmar' THEN 'baixada' ELSE 'rejeitada' END,
    approved_by = CASE WHEN p_action = 'confirmar' THEN actor_profile ELSE NULL END,
    processed_by = actor_profile, processed_at = now(),
    rejection_reason = CASE WHEN p_action = 'rejeitar' THEN trim(p_reason) ELSE NULL END,
    updated_at = now()
  WHERE id = p_requisition_id;

  SELECT user_id INTO requester_user FROM public.profiles WHERE id = requisition_row.requested_by;
  IF requester_user IS NOT NULL THEN
    INSERT INTO public.notifications (
      recipient_id, title, message, type, related_entity_type,
      related_entity_id, action_url
    ) VALUES (
      requester_user,
      CASE WHEN p_action = 'confirmar' THEN 'Baixa de insumos confirmada' ELSE 'Requisição de insumos rejeitada' END,
      'A requisição ' || requisition_row.requisition_number || ' foi ' ||
        CASE WHEN p_action = 'confirmar' THEN 'confirmada e baixada do estoque.' ELSE 'rejeitada.' END,
      'supply_requisition_status', 'supply_requisition', p_requisition_id, '/insumos'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_supply_quantities()
RETURNS TABLE (supply_id UUID, pending_quantity BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.supply_id, sum(i.quantity)::bigint
  FROM public.supply_requisition_items i
  JOIN public.supply_requisitions r ON r.id = i.requisition_id
  WHERE r.approval_status = 'pendente_baixa'
  GROUP BY i.supply_id
$$;

REVOKE ALL ON FUNCTION public.create_supply_requisition(JSONB, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_supply_requisition(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_supply_quantities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_supply_requisition(JSONB, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_supply_requisition(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_supply_quantities() TO authenticated;
