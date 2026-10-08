-- Structured asset locations and auditable physical inventory workflow.

CREATE TABLE IF NOT EXISTS public.asset_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.asset_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID REFERENCES public.asset_floors(id),
  name VARCHAR(120) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (floor_id, name)
);

ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS asset_location_id UUID REFERENCES public.asset_locations(id);

INSERT INTO public.asset_floors (name)
SELECT DISTINCT trim(floor) FROM public.equipments
WHERE NULLIF(trim(floor), '') IS NOT NULL
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.asset_locations (floor_id, name)
SELECT DISTINCT f.id, trim(e.location)
FROM public.equipments e
LEFT JOIN public.asset_floors f ON f.name = trim(e.floor)
WHERE NULLIF(trim(e.location), '') IS NOT NULL
ON CONFLICT (floor_id, name) DO NOTHING;

UPDATE public.equipments e
SET asset_location_id = l.id
FROM public.asset_locations l
LEFT JOIN public.asset_floors f ON f.id = l.floor_id
WHERE e.asset_location_id IS NULL
  AND trim(e.location) = l.name
  AND (NULLIF(trim(e.floor), '') IS NULL OR f.name = trim(e.floor));

CREATE OR REPLACE FUNCTION public.sync_equipment_asset_location()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_floor_id UUID; v_floor_name TEXT; v_location public.asset_locations%ROWTYPE;
BEGIN
  IF NEW.asset_location_id IS NOT NULL THEN
    SELECT l.* INTO v_location FROM public.asset_locations l WHERE l.id = NEW.asset_location_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Local patrimonial inválido.'; END IF;
    NEW.location := v_location.name;
    SELECT name INTO v_floor_name FROM public.asset_floors WHERE id = v_location.floor_id;
    NEW.floor := v_floor_name;
    RETURN NEW;
  END IF;
  IF NULLIF(trim(NEW.location), '') IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.asset_floors (name, created_by)
  VALUES (COALESCE(NULLIF(trim(NEW.floor), ''), 'Não informado'), auth.uid())
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_floor_id;
  SELECT * INTO v_location FROM public.asset_locations
  WHERE floor_id = v_floor_id AND lower(name) = lower(trim(NEW.location)) LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.asset_locations (floor_id, name, created_by)
    VALUES (v_floor_id, trim(NEW.location), auth.uid()) RETURNING * INTO v_location;
  END IF;
  NEW.asset_location_id := v_location.id;
  NEW.floor := COALESCE(NULLIF(trim(NEW.floor), ''), 'Não informado');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_equipment_asset_location_trigger ON public.equipments;
CREATE TRIGGER sync_equipment_asset_location_trigger
BEFORE INSERT OR UPDATE OF asset_location_id, location, floor ON public.equipments
FOR EACH ROW EXECUTE FUNCTION public.sync_equipment_asset_location();

CREATE TABLE IF NOT EXISTS public.inventory_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT NOT NULL UNIQUE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline DATE NOT NULL,
  location_id UUID REFERENCES public.asset_locations(id),
  all_locations BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  responsible_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (all_locations OR location_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.inventory_request_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.inventory_requests(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.asset_locations(id),
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  UNIQUE (request_id, location_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.inventory_requests(id) ON DELETE CASCADE,
  request_location_id UUID NOT NULL REFERENCES public.inventory_request_locations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id),
  expected_location_id UUID NOT NULL REFERENCES public.asset_locations(id),
  status TEXT NOT NULL DEFAULT 'nao_encontrado'
    CHECK (status IN ('nao_encontrado', 'encontrado')),
  found_at TIMESTAMPTZ,
  found_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_requests_responsible ON public.inventory_requests(responsible_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_request_location ON public.inventory_items(request_id, expected_location_id);

ALTER TABLE public.asset_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_request_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view asset floors" ON public.asset_floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage asset floors" ON public.asset_floors FOR ALL TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Authenticated users can view asset locations" ON public.asset_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage asset locations" ON public.asset_locations FOR ALL TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));

CREATE POLICY "Authorized users can view inventory requests" ON public.inventory_requests FOR SELECT TO authenticated
USING (public.current_user_role() = 'administrador' OR responsible_profile_id = public.current_profile_id());
CREATE POLICY "Administrators can create inventory requests" ON public.inventory_requests FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() = 'administrador');
CREATE POLICY "Authorized users can view inventory locations" ON public.inventory_request_locations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.inventory_requests r WHERE r.id = request_id AND (public.current_user_role() = 'administrador' OR r.responsible_profile_id = public.current_profile_id())));
CREATE POLICY "Authorized users can view inventory items" ON public.inventory_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.inventory_requests r WHERE r.id = request_id AND (public.current_user_role() = 'administrador' OR r.responsible_profile_id = public.current_profile_id())));

CREATE OR REPLACE FUNCTION public.create_inventory_request(
  p_deadline DATE,
  p_location_id UUID,
  p_all_locations BOOLEAN,
  p_responsible_profile_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_label TEXT;
  v_base TEXT;
  v_code TEXT;
  v_suffix INTEGER := 1;
BEGIN
  IF public.current_user_role() <> 'administrador' THEN RAISE EXCEPTION 'Apenas o Administrador pode gerar inventários.'; END IF;
  IF p_deadline < CURRENT_DATE THEN RAISE EXCEPTION 'A data limite não pode estar no passado.'; END IF;
  IF NOT p_all_locations AND p_location_id IS NULL THEN RAISE EXCEPTION 'Selecione um ambiente.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_responsible_profile_id AND is_active = true) THEN RAISE EXCEPTION 'Responsável inválido ou inativo.'; END IF;

  SELECT CASE WHEN p_all_locations THEN 'Todos' ELSE name END INTO v_label
  FROM public.asset_locations WHERE id = p_location_id OR p_all_locations LIMIT 1;
  v_label := regexp_replace(unaccent(COALESCE(v_label, 'Todos')), '[^a-zA-Z0-9]+', '', 'g');
  v_base := to_char(CURRENT_DATE, 'YYYY/MM') || '-' || v_label;
  v_code := v_base;
  WHILE EXISTS (SELECT 1 FROM public.inventory_requests WHERE request_code = v_code) LOOP
    v_suffix := v_suffix + 1; v_code := v_base || '-' || lpad(v_suffix::TEXT, 2, '0');
  END LOOP;

  INSERT INTO public.inventory_requests (request_code, deadline, location_id, all_locations, responsible_profile_id, created_by)
  VALUES (v_code, p_deadline, CASE WHEN p_all_locations THEN NULL ELSE p_location_id END, p_all_locations, p_responsible_profile_id, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.inventory_request_locations (request_id, location_id)
  SELECT v_id, l.id FROM public.asset_locations l
  WHERE l.status = 'ativo' AND (p_all_locations OR l.id = p_location_id)
    AND EXISTS (SELECT 1 FROM public.equipments e WHERE e.asset_location_id = l.id);

  INSERT INTO public.inventory_items (request_id, request_location_id, equipment_id, expected_location_id)
  SELECT v_id, scope.id, e.id, scope.location_id
  FROM public.inventory_request_locations scope
  JOIN public.equipments e ON e.asset_location_id = scope.location_id
  WHERE scope.request_id = v_id AND e.status <> 'baixado';

  IF NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE request_id = v_id) THEN
    RAISE EXCEPTION 'Nenhum patrimônio ativo foi encontrado no ambiente selecionado.';
  END IF;

  INSERT INTO public.notifications (recipient_id, title, message, type, related_entity_type, related_entity_id, action_url)
  SELECT p.user_id, 'Novo inventário atribuído', 'Você foi designado para o inventário ' || v_code || '.',
    'inventario', 'inventory_request', v_id, '/equipamentos?inventario=' || v_id::TEXT
  FROM public.profiles p WHERE p.id = p_responsible_profile_id AND p.user_id IS NOT NULL AND p.user_id <> auth.uid();
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_inventory_progress(
  p_request_id UUID,
  p_location_id UUID,
  p_found_equipment_ids UUID[],
  p_complete BOOLEAN DEFAULT false
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_request public.inventory_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM public.inventory_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada.'; END IF;
  IF public.current_user_role() <> 'administrador' AND v_request.responsible_profile_id <> public.current_profile_id() THEN
    RAISE EXCEPTION 'Usuário não autorizado para este inventário.';
  END IF;
  IF v_request.status IN ('concluido', 'cancelado') THEN RAISE EXCEPTION 'Este inventário não aceita alterações.'; END IF;
  IF EXISTS (SELECT 1 FROM public.inventory_request_locations WHERE request_id = p_request_id AND location_id = p_location_id AND status = 'concluido') THEN
    RAISE EXCEPTION 'O inventário deste ambiente já foi concluído.';
  END IF;

  UPDATE public.inventory_items SET status = 'nao_encontrado', found_at = NULL, found_by = NULL, updated_at = now()
  WHERE request_id = p_request_id AND expected_location_id = p_location_id;
  UPDATE public.inventory_items SET status = 'encontrado', found_at = now(), found_by = auth.uid(), updated_at = now()
  WHERE request_id = p_request_id AND expected_location_id = p_location_id
    AND equipment_id = ANY(COALESCE(p_found_equipment_ids, ARRAY[]::UUID[]));

  UPDATE public.inventory_request_locations
  SET status = CASE WHEN p_complete THEN 'concluido' ELSE 'em_andamento' END,
      completed_at = CASE WHEN p_complete THEN now() ELSE NULL END,
      completed_by = CASE WHEN p_complete THEN auth.uid() ELSE NULL END
  WHERE request_id = p_request_id AND location_id = p_location_id;

  UPDATE public.inventory_requests SET status = 'em_andamento', updated_at = now() WHERE id = p_request_id;

  IF p_complete THEN
    INSERT INTO public.equipment_history (equipment_id, action, old_status, new_status, old_location, new_location, description, changed_by, metadata)
    SELECT i.equipment_id, 'inventario', e.status, e.status, e.location, e.location,
      'Conferência do inventário ' || v_request.request_code || ': ' || CASE WHEN i.status = 'encontrado' THEN 'Encontrado' ELSE 'Não encontrado' END,
      auth.uid(), jsonb_build_object('inventory_request_id', p_request_id, 'inventory_code', v_request.request_code, 'result', i.status)
    FROM public.inventory_items i JOIN public.equipments e ON e.id = i.equipment_id
    WHERE i.request_id = p_request_id AND i.expected_location_id = p_location_id;

    IF NOT EXISTS (SELECT 1 FROM public.inventory_request_locations WHERE request_id = p_request_id AND status <> 'concluido') THEN
      UPDATE public.inventory_requests SET status = 'concluido', completed_at = now(), completed_by = auth.uid(), updated_at = now() WHERE id = p_request_id;
    END IF;
  END IF;
END;
$$;

-- Keep the existing movement API while resolving the destination through the
-- structured location id (the legacy location name remains accepted).
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
  SELECT * INTO v_destination FROM public.asset_locations
  WHERE id::TEXT = p_destination OR lower(name) = lower(trim(p_destination)) ORDER BY (id::TEXT = p_destination) DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selecione um local de destino cadastrado.'; END IF;
  IF v_equipment.asset_location_id = v_destination.id THEN RAISE EXCEPTION 'O destino deve ser diferente do local atual.'; END IF;
  SELECT name INTO v_floor FROM public.asset_floors WHERE id = v_destination.floor_id;
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

GRANT EXECUTE ON FUNCTION public.create_inventory_request(DATE,UUID,BOOLEAN,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_inventory_progress(UUID,UUID,UUID[],BOOLEAN) TO authenticated;
NOTIFY pgrst, 'reload schema';
