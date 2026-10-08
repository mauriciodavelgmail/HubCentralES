-- Inventory fields required by the HUB ES+ workbook and auditable asset movements.

ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS floor TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_path TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'UNIDADE',
  ADD COLUMN IF NOT EXISTS acquisition_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS defect_notes TEXT,
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS import_sheet TEXT,
  ADD COLUMN IF NOT EXISTS import_row INTEGER,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

ALTER TABLE public.equipment_history
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_path TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipments_import_origin
ON public.equipments(import_source, import_sheet, import_row)
WHERE import_source IS NOT NULL AND import_sheet IS NOT NULL AND import_row IS NOT NULL;

DROP POLICY IF EXISTS "Authorized users can create equipment history" ON public.equipment_history;
CREATE POLICY "Authorized users can create equipment history"
ON public.equipment_history FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));

CREATE OR REPLACE FUNCTION public.log_equipment_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.equipment_history (
    equipment_id, action, new_status, new_location, new_responsible_id,
    description, changed_by, invoice_number, invoice_url, invoice_path,
    image_url, image_path, metadata
  ) VALUES (
    NEW.id, 'cadastro', NEW.status, NEW.location, NEW.responsible_id,
    CASE WHEN NEW.import_source IS NOT NULL
      THEN 'Patrimônio importado de ' || NEW.import_source || ' / ' || COALESCE(NEW.import_sheet, '')
      ELSE 'Cadastro inicial do patrimônio'
    END,
    COALESCE(NEW.created_by, auth.uid()), NEW.invoice_number, NEW.invoice_url,
    NEW.invoice_path, NEW.image_url, NEW.image_path,
    jsonb_build_object(
      'quantity', NEW.quantity,
      'floor', NEW.floor,
      'import_row', NEW.import_row,
      'acquisition_source', NEW.acquisition_source
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS equipment_registration_history_trigger ON public.equipments;
CREATE TRIGGER equipment_registration_history_trigger
AFTER INSERT ON public.equipments
FOR EACH ROW EXECUTE FUNCTION public.log_equipment_registration();

CREATE OR REPLACE FUNCTION public.move_equipment(
  p_equipment_id UUID,
  p_destination TEXT,
  p_description TEXT DEFAULT NULL,
  p_invoice_number TEXT DEFAULT NULL,
  p_invoice_url TEXT DEFAULT NULL,
  p_invoice_path TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_image_path TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipment public.equipments%ROWTYPE;
  v_history_id UUID;
  v_profile_id UUID;
BEGIN
  IF public.current_user_role() NOT IN ('administrador', 'administracao') THEN
    RAISE EXCEPTION 'Apenas Administrador ou Administração podem movimentar patrimônios.';
  END IF;
  IF NULLIF(trim(p_destination), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o local de destino.';
  END IF;

  SELECT * INTO v_equipment FROM public.equipments
  WHERE id = p_equipment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patrimônio não encontrado.'; END IF;
  IF trim(v_equipment.location) = trim(p_destination) THEN
    RAISE EXCEPTION 'O destino deve ser diferente do local atual.';
  END IF;

  UPDATE public.equipments
  SET location = trim(p_destination), updated_by = auth.uid(),
      image_url = COALESCE(p_image_url, image_url),
      image_path = COALESCE(p_image_path, image_path),
      invoice_number = COALESCE(p_invoice_number, invoice_number),
      invoice_url = COALESCE(p_invoice_url, invoice_url),
      invoice_path = COALESCE(p_invoice_path, invoice_path)
  WHERE id = p_equipment_id;

  INSERT INTO public.equipment_history (
    equipment_id, action, old_status, new_status, old_location, new_location,
    old_responsible_id, new_responsible_id, description, changed_by,
    invoice_number, invoice_url, invoice_path, image_url, image_path
  ) VALUES (
    v_equipment.id, 'movimentacao', v_equipment.status, v_equipment.status,
    v_equipment.location, trim(p_destination), v_equipment.responsible_id,
    v_equipment.responsible_id, NULLIF(trim(p_description), ''), auth.uid(),
    NULLIF(trim(p_invoice_number), ''), p_invoice_url, p_invoice_path,
    p_image_url, p_image_path
  ) RETURNING id INTO v_history_id;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.notifications (
    recipient_id, title, message, type, related_entity_type,
    related_entity_id, is_read, action_url
  )
  SELECT p.user_id, 'Patrimônio movimentado',
    v_equipment.name || ' foi movimentado de ' || v_equipment.location || ' para ' || trim(p_destination) || '.',
    'equipamento_movimentado', 'equipment', v_equipment.id, false,
    '/equipamentos?patrimonio=' || v_equipment.id::TEXT
  FROM public.profiles p
  WHERE p.role IN ('administrador', 'administracao')
    AND p.user_id IS NOT NULL AND p.is_active = true
    AND p.id IS DISTINCT FROM v_profile_id;

  RETURN v_history_id;
END;
$$;

REVOKE ALL ON FUNCTION public.move_equipment(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_equipment(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
