-- Security, audit trail and event workflow hardening.
-- Apply after 001-004 in the Supabase SQL editor or CLI.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1
$$;

-- Remove the self-referencing profile policies that can cause RLS recursion.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Authenticated users can view operational profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.current_user_role() IN ('administrador', 'administracao', 'recepcao', 'manutencao', 'limpeza')
);
CREATE POLICY "Administrators can update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

-- Reference data must be readable for forms and calendar rendering.
CREATE POLICY "Authenticated users can view departments"
ON public.departments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can view spaces"
ON public.spaces FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Administrators can manage departments"
ON public.departments FOR ALL TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');
CREATE POLICY "Administrators can manage spaces"
ON public.spaces FOR ALL TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

-- Complete CRUD policies for the operational modules.
CREATE POLICY "Authorized users can update occurrences"
ON public.occurrences FOR UPDATE TO authenticated
USING (
  public.current_user_role() IN ('administrador', 'administracao')
  OR responsible_id = public.current_profile_id()
  OR reporter_id = public.current_profile_id()
)
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao', 'manutencao', 'limpeza'));
CREATE POLICY "Administrators can delete occurrences"
ON public.occurrences FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');

CREATE POLICY "Users can view occurrence comments"
ON public.occurrence_comments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can create occurrence comments"
ON public.occurrence_comments FOR INSERT TO authenticated
WITH CHECK (author_id = public.current_profile_id());
CREATE POLICY "Users can view occurrence history"
ON public.occurrence_history FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage supplies" ON public.supplies;
CREATE POLICY "Administration can create supplies"
ON public.supplies FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Administration can update supplies"
ON public.supplies FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Administrators can delete supplies"
ON public.supplies FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');
CREATE POLICY "Authorized users can view supply movements"
ON public.supply_movements FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao', 'manutencao', 'limpeza'));
CREATE POLICY "Administration can create supply movements"
ON public.supply_movements FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Authorized users can view supply requisitions"
ON public.supply_requisitions FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao') OR requested_by = public.current_profile_id());
CREATE POLICY "Maintenance can request supplies"
ON public.supply_requisitions FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_role() IN ('manutencao', 'limpeza')
  AND requested_by = public.current_profile_id()
);
CREATE POLICY "Administration can approve supply requisitions"
ON public.supply_requisitions FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));

CREATE POLICY "Administration can update purchases"
ON public.purchases FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Administrators can delete purchases"
ON public.purchases FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');
CREATE POLICY "Authorized users can view purchase history"
ON public.purchase_history FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'));

DROP POLICY IF EXISTS "Admins can manage equipments" ON public.equipments;
CREATE POLICY "Administration can create equipments"
ON public.equipments FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Authorized users can update equipments"
ON public.equipments FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao', 'manutencao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao', 'manutencao'));
CREATE POLICY "Administrators can delete equipments"
ON public.equipments FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');
CREATE POLICY "Authorized users can view equipment history"
ON public.equipment_history FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao', 'manutencao'));

CREATE POLICY "Document managers can view versions"
ON public.document_versions FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Document managers can create versions"
ON public.document_versions FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));

CREATE POLICY "Administrators can view audit logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (public.current_user_role() = 'administrador');
CREATE POLICY "Administrators can view settings"
ON public.settings FOR SELECT TO authenticated
USING (public.current_user_role() = 'administrador');
CREATE POLICY "Administrators can manage settings"
ON public.settings FOR ALL TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

-- Calendar workflow: normalize ownership/status and reject overlapping bookings.
CREATE OR REPLACE FUNCTION public.prepare_event_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_profile UUID;
  requester_role public.user_role;
BEGIN
  SELECT id, role INTO requester_profile, requester_role
  FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    NEW.requester_id := COALESCE(NEW.requester_id, requester_profile);
    NEW.responsible_id := COALESCE(NEW.responsible_id, requester_profile);
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    NEW.status := CASE WHEN requester_role = 'administrador' THEN 'confirmada'::public.event_status ELSE 'aguardando_aprovacao'::public.event_status END;
    IF requester_role = 'administrador' THEN
      NEW.approved_by := requester_profile;
      NEW.approved_at := CURRENT_TIMESTAMP;
    END IF;
  ELSE
    NEW.updated_by := auth.uid();
  END IF;

  IF NEW.status <> 'cancelada' AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.space_id = NEW.space_id
      AND e.start_date = NEW.start_date
      AND e.status <> 'cancelada'
      AND e.id <> COALESCE(NEW.id, uuid_nil())
      AND NEW.start_time < e.end_time
      AND NEW.end_time > e.start_time
  ) THEN
    RAISE EXCEPTION 'O espaço já possui um evento nesse intervalo.' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_event_booking_trigger ON public.events;
CREATE TRIGGER prepare_event_booking_trigger
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.prepare_event_booking();

DROP POLICY IF EXISTS "Authorized users can create events" ON public.events;
CREATE POLICY "Authorized users can create events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao', 'visitante'));
CREATE POLICY "Administrators can update events"
ON public.events FOR UPDATE TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');
CREATE POLICY "Administrators can delete events"
ON public.events FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');
CREATE POLICY "Authorized users can view attendance"
ON public.attendance_list FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao', 'recepcao'));
CREATE POLICY "Authorized users can manage attendance"
ON public.attendance_list FOR ALL TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao', 'recepcao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao', 'recepcao'));

CREATE OR REPLACE FUNCTION public.notify_event_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (recipient_id, title, message, type, related_entity_type, related_entity_id, action_url)
  SELECT DISTINCT recipient_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'Nova solicitação de agenda' ELSE 'Agendamento atualizado' END,
    CASE WHEN TG_OP = 'INSERT'
      THEN 'O evento "' || NEW.title || '" aguarda acompanhamento.'
      ELSE 'O evento "' || NEW.title || '" mudou para ' || replace(NEW.status::TEXT, '_', ' ') || '.'
    END,
    CASE WHEN TG_OP = 'INSERT' THEN 'event_created' ELSE 'event_status_changed' END,
    'event', NEW.id, '/agenda'
  FROM (
    SELECT p.user_id AS recipient_id FROM public.profiles p
    WHERE p.is_active = TRUE AND p.user_id IS NOT NULL
      AND p.role IN ('administrador', 'administracao', 'recepcao')
    UNION
    SELECT p.user_id FROM public.profiles p WHERE p.id = NEW.requester_id AND p.user_id IS NOT NULL
  ) recipients;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_event_change_trigger ON public.events;
CREATE TRIGGER notify_event_change_trigger
AFTER INSERT OR UPDATE OF status ON public.events
FOR EACH ROW EXECUTE FUNCTION public.notify_event_change();

-- Universal audit log for every insert/update/delete on the main business entities.
CREATE OR REPLACE FUNCTION public.write_activity_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_id UUID;
BEGIN
  record_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    auth.uid(), lower(TG_OP), TG_TABLE_NAME, record_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'departments', 'spaces', 'documents', 'document_versions',
    'occurrences', 'occurrence_comments', 'events', 'attendance_list',
    'supplies', 'supply_movements', 'supply_requisitions', 'purchases',
    'equipments', 'settings'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_activity_log()',
      table_name
    );
  END LOOP;
END;
$$;

