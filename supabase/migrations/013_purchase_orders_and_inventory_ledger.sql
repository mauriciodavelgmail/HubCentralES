-- Purchase orders with atomic inventory updates and an immutable audit trail.

ALTER TABLE public.purchases
  ALTER COLUMN supply_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS purchase_type TEXT NOT NULL DEFAULT 'avulsa',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS requested_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS fiscal_document_id UUID REFERENCES public.documents(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchases_purchase_type_check'
  ) THEN
    ALTER TABLE public.purchases ADD CONSTRAINT purchases_purchase_type_check
      CHECK (purchase_type IN ('avulsa', 'insumos'));
  END IF;
END $$;

ALTER TABLE public.supplies
  ADD COLUMN IF NOT EXISTS last_purchase_date DATE;

-- Keep the documents bucket compatible with fiscal documents in PDF or image format.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp'
]
WHERE id = 'documents';

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id),
  supply_id UUID NOT NULL REFERENCES public.supplies(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  supply_code_snapshot TEXT NOT NULL,
  supply_name_snapshot TEXT NOT NULL,
  description_snapshot TEXT,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  minimum_quantity_snapshot INTEGER NOT NULL,
  status_snapshot TEXT,
  previous_unit_cost NUMERIC(12, 2),
  previous_last_purchase_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (purchase_id, supply_id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_supply ON public.purchase_items(supply_id);

ALTER TABLE public.supply_movements
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES public.purchases(id),
  ADD COLUMN IF NOT EXISTS operation_type TEXT,
  ADD COLUMN IF NOT EXISTS balance_before INTEGER,
  ADD COLUMN IF NOT EXISTS balance_after INTEGER,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.purchase_history
  ADD COLUMN IF NOT EXISTS operation_type TEXT NOT NULL DEFAULT 'alteracao',
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized users can view purchase items" ON public.purchase_items;
CREATE POLICY "Authorized users can view purchase items"
ON public.purchase_items FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'));

DROP POLICY IF EXISTS "Authorized users can create purchases" ON public.purchases;
DROP POLICY IF EXISTS "Administration can update purchases" ON public.purchases;
DROP POLICY IF EXISTS "Administrators can delete purchases" ON public.purchases;
DROP POLICY IF EXISTS "Administrators can update purchases" ON public.purchases;

CREATE POLICY "Administrators can update purchases"
ON public.purchases FOR UPDATE TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

CREATE OR REPLACE FUNCTION public.prevent_purchase_deletion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Pedidos de compra não podem ser excluídos; utilize o cancelamento.';
END;
$$;

DROP TRIGGER IF EXISTS prevent_purchase_deletion ON public.purchases;
CREATE TRIGGER prevent_purchase_deletion
BEFORE DELETE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.prevent_purchase_deletion();

CREATE OR REPLACE FUNCTION public.protect_purchase_cancellation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'cancelada'::purchase_status
     AND NEW.status = 'cancelada'::purchase_status
     AND COALESCE(current_setting('app.purchase_cancellation', true), '') <> 'allowed' THEN
    RAISE EXCEPTION 'Utilize a operação oficial de cancelamento para preservar o estoque e o histórico.';
  END IF;
  IF OLD.status = 'cancelada'::purchase_status THEN
    RAISE EXCEPTION 'Um pedido cancelado não pode ser alterado.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_purchase_cancellation ON public.purchases;
CREATE TRIGGER protect_purchase_cancellation
BEFORE UPDATE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.protect_purchase_cancellation();

CREATE OR REPLACE FUNCTION public.issue_purchase_order(
  p_purchase JSONB,
  p_items JSONB DEFAULT '[]'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role user_role;
  actor_profile UUID;
  v_purchase_id UUID;
  purchase_kind TEXT := COALESCE(p_purchase->>'purchase_type', 'avulsa');
  purchase_status_value purchase_status := 'compra_realizada';
  item JSONB;
  supply_row public.supplies%ROWTYPE;
  item_quantity INTEGER;
  item_unit_cost NUMERIC(12, 2);
  new_balance INTEGER;
  order_total NUMERIC(12, 2) := 0;
  document_id UUID;
BEGIN
  SELECT role, id INTO actor_role, actor_profile
  FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = true;

  IF actor_role IS NULL OR actor_role NOT IN ('administrador', 'administracao') THEN
    RAISE EXCEPTION 'Apenas Administrador e Administração podem emitir pedidos.';
  END IF;
  IF purchase_kind NOT IN ('avulsa', 'insumos') THEN
    RAISE EXCEPTION 'Tipo de compra inválido.';
  END IF;
  IF NULLIF(trim(p_purchase->>'purchase_number'), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o número do documento da operação.';
  END IF;
  IF purchase_kind = 'insumos' AND jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Adicione pelo menos um insumo ao pedido.';
  END IF;
  IF purchase_kind = 'insumos' AND NULLIF(p_purchase->>'fiscal_document_url', '') IS NULL THEN
    RAISE EXCEPTION 'Anexe o documento da operação da compra de insumos.';
  END IF;

  INSERT INTO public.purchases (
    purchase_number, purchase_type, description, supplier, status, priority,
    solicitant_id, estimated_value, justification, purchase_document_number,
    fiscal_document_url, requested_date, expected_delivery_date, notes,
    created_by, updated_by
  ) VALUES (
    trim(p_purchase->>'purchase_number'), purchase_kind,
    NULLIF(trim(p_purchase->>'description'), ''), NULLIF(trim(p_purchase->>'supplier'), ''),
    purchase_status_value, COALESCE(NULLIF(p_purchase->>'priority', ''), 'media')::occurrence_priority,
    actor_profile, NULLIF(p_purchase->>'estimated_value', '')::numeric,
    NULLIF(trim(p_purchase->>'justification'), ''), trim(p_purchase->>'purchase_number'),
    NULLIF(p_purchase->>'fiscal_document_url', ''), CURRENT_DATE,
    NULLIF(p_purchase->>'expected_delivery_date', '')::date,
    NULLIF(trim(p_purchase->>'notes'), ''), auth.uid(), auth.uid()
  ) RETURNING id INTO v_purchase_id;

  IF purchase_kind = 'insumos' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
      item_quantity := COALESCE((item->>'quantity')::integer, 0);
      item_unit_cost := COALESCE((item->>'unit_cost')::numeric, -1);
      IF item_quantity <= 0 OR item_unit_cost < 0 THEN
        RAISE EXCEPTION 'Quantidade e valor dos itens devem ser válidos.';
      END IF;

      SELECT * INTO supply_row FROM public.supplies
      WHERE id = (item->>'supply_id')::uuid FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insumo não encontrado.'; END IF;

      new_balance := supply_row.current_quantity + item_quantity;
      INSERT INTO public.purchase_items (
        purchase_id, supply_id, quantity, unit_cost, supply_code_snapshot,
        supply_name_snapshot, description_snapshot, balance_before, balance_after,
        minimum_quantity_snapshot, status_snapshot, previous_unit_cost,
        previous_last_purchase_date, created_by
      ) VALUES (
        v_purchase_id, supply_row.id, item_quantity, item_unit_cost, supply_row.code,
        supply_row.name, supply_row.description, supply_row.current_quantity, new_balance,
        supply_row.minimum_quantity, supply_row.status, supply_row.unit_cost,
        supply_row.last_purchase_date, auth.uid()
      );

      UPDATE public.supplies SET
        current_quantity = new_balance,
        unit_cost = item_unit_cost,
        last_purchase_date = CURRENT_DATE,
        status = CASE
          WHEN new_balance <= 0 THEN 'critico'
          WHEN new_balance <= minimum_quantity THEN 'baixo'
          ELSE 'normal'
        END,
        updated_at = now(), updated_by = auth.uid()
      WHERE id = supply_row.id;

      INSERT INTO public.supply_movements (
        supply_id, movement_type, quantity_moved, reason, requested_by,
        approved_by, created_by, purchase_id, operation_type,
        balance_before, balance_after, metadata
      ) VALUES (
        supply_row.id, 'entrada', item_quantity,
        'Entrada pelo pedido ' || trim(p_purchase->>'purchase_number'),
        actor_profile, actor_profile, auth.uid(), v_purchase_id, 'compra_emitida',
        supply_row.current_quantity, new_balance,
        jsonb_build_object('unit_cost', item_unit_cost, 'purchase_number', trim(p_purchase->>'purchase_number'))
      );
      order_total := order_total + (item_quantity * item_unit_cost);
    END LOOP;
  ELSE
    order_total := COALESCE(NULLIF(p_purchase->>'total_cost', '')::numeric, 0);
  END IF;

  UPDATE public.purchases SET total_cost = order_total,
    quantity = CASE WHEN purchase_kind = 'insumos' THEN (SELECT sum(pi.quantity) FROM public.purchase_items pi WHERE pi.purchase_id = v_purchase_id) ELSE NULLIF(p_purchase->>'quantity', '')::integer END,
    unit_cost = CASE WHEN purchase_kind = 'avulsa' THEN NULLIF(p_purchase->>'unit_cost', '')::numeric ELSE NULL END
  WHERE id = v_purchase_id;

  IF NULLIF(p_purchase->>'fiscal_document_url', '') IS NOT NULL THEN
    INSERT INTO public.documents (
      control_id, title, description, category, status, responsible_id,
      file_url, file_size, file_type, related_purchase_id, tags, created_by, updated_by
    ) VALUES (
      'DF' || upper(substr(replace(v_purchase_id::text, '-', ''), 1, 10)),
      'Documento fiscal - ' || trim(p_purchase->>'purchase_number'),
      COALESCE(NULLIF(trim(p_purchase->>'description'), ''), 'Documento da operação de compra'),
      'documentos_fiscais', 'ativo', actor_profile,
      p_purchase->>'fiscal_document_url', NULLIF(p_purchase->>'fiscal_document_size', '')::integer,
      NULLIF(p_purchase->>'fiscal_document_type', ''), v_purchase_id,
      ARRAY['compra', 'documento_fiscal'], auth.uid(), auth.uid()
    ) RETURNING id INTO document_id;
    UPDATE public.purchases SET fiscal_document_id = document_id WHERE id = v_purchase_id;
  END IF;

  INSERT INTO public.purchase_history (
    purchase_id, old_status, new_status, changed_by, notes,
    operation_type, reason, metadata
  ) VALUES (
    v_purchase_id, NULL, purchase_status_value, auth.uid(),
    'Pedido emitido e estoque atualizado', 'emissao',
    COALESCE(NULLIF(trim(p_purchase->>'justification'), ''), 'Emissão de pedido'),
    jsonb_build_object('purchase_type', purchase_kind, 'total_cost', order_total, 'item_count', jsonb_array_length(COALESCE(p_items, '[]'::jsonb)))
  );

  RETURN v_purchase_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_purchase_order(
  p_purchase_id UUID,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role user_role;
  actor_profile UUID;
  purchase_row public.purchases%ROWTYPE;
  item RECORD;
  supply_row public.supplies%ROWTYPE;
  new_balance INTEGER;
BEGIN
  SELECT role, id INTO actor_role, actor_profile FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = true;
  IF actor_role IS DISTINCT FROM 'administrador'::user_role THEN
    RAISE EXCEPTION 'Somente o Administrador pode cancelar pedidos.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'Informe um motivo de cancelamento com pelo menos 5 caracteres.';
  END IF;

  SELECT * INTO purchase_row FROM public.purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF purchase_row.status = 'cancelada' THEN RAISE EXCEPTION 'Este pedido já foi cancelado.'; END IF;

  IF purchase_row.purchase_type = 'insumos' THEN
    FOR item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id
    LOOP
      SELECT * INTO supply_row FROM public.supplies WHERE id = item.supply_id FOR UPDATE;
      new_balance := supply_row.current_quantity - item.quantity;
      UPDATE public.supplies SET
        current_quantity = new_balance,
        status = CASE
          WHEN new_balance <= 0 THEN 'critico'
          WHEN new_balance <= minimum_quantity THEN 'baixo'
          ELSE 'normal'
        END,
        updated_at = now(), updated_by = auth.uid()
      WHERE id = item.supply_id;

      INSERT INTO public.supply_movements (
        supply_id, movement_type, quantity_moved, reason, requested_by,
        approved_by, created_by, purchase_id, operation_type,
        balance_before, balance_after, metadata
      ) VALUES (
        item.supply_id, 'saida', item.quantity,
        'Estorno do pedido ' || purchase_row.purchase_number || ': ' || trim(p_reason),
        actor_profile, actor_profile, auth.uid(), p_purchase_id, 'compra_cancelada',
        supply_row.current_quantity, new_balance,
        jsonb_build_object('purchase_number', purchase_row.purchase_number, 'cancellation_reason', trim(p_reason))
      );
    END LOOP;
  END IF;

  PERFORM set_config('app.purchase_cancellation', 'allowed', true);
  UPDATE public.purchases SET status = 'cancelada', cancellation_reason = trim(p_reason),
    cancelled_at = now(), cancelled_by = actor_profile, updated_at = now(), updated_by = auth.uid()
  WHERE id = p_purchase_id;

  INSERT INTO public.purchase_history (
    purchase_id, old_status, new_status, changed_by, notes,
    operation_type, reason, metadata
  ) VALUES (
    p_purchase_id, purchase_row.status, 'cancelada', auth.uid(),
    'Pedido cancelado e estoque estornado', 'cancelamento', trim(p_reason),
    jsonb_build_object('purchase_type', purchase_row.purchase_type)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_purchase_order(JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_purchase_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_purchase_order(JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_purchase_order(UUID, TEXT) TO authenticated;
