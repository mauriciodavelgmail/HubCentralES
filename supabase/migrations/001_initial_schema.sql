-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extension for full-text search
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'administrador',
  'administracao',
  'recepcao',
  'manutencao',
  'limpeza',
  'visitante'
);

CREATE TYPE occurrence_status AS ENUM (
  'aberta',
  'em_analise',
  'em_execucao',
  'resolvida',
  'cancelada'
);

CREATE TYPE occurrence_priority AS ENUM (
  'baixa',
  'media',
  'alta',
  'critica'
);

CREATE TYPE occurrence_category AS ENUM (
  'infraestrutura',
  'limpeza',
  'equipamentos',
  'evento',
  'seguranca',
  'tecnologia',
  'manutencao',
  'outros'
);

CREATE TYPE document_status AS ENUM (
  'ativo',
  'vencendo',
  'vencido',
  'arquivado'
);

CREATE TYPE document_category AS ENUM (
  'contratos',
  'editais',
  'pops',
  'atas',
  'normas',
  'relatorios',
  'comunicacao_institucional',
  'ocorrencias',
  'documentos_fiscais',
  'patrimonio'
);

CREATE TYPE event_status AS ENUM (
  'aguardando_aprovacao',
  'confirmada',
  'cancelada',
  'realizada'
);

CREATE TYPE event_type AS ENUM (
  'workshop',
  'palestra',
  'encontro',
  'reuniao',
  'outros'
);

CREATE TYPE available_space AS ENUM (
  'auditorio',
  'lab_maker',
  'sala_criativa',
  'coworking',
  'hall',
  'espaco_multiuso'
);

CREATE TYPE supply_category AS ENUM (
  'limpeza',
  'escritorio',
  'evento',
  'manutencao',
  'tecnologia',
  'consumo'
);

CREATE TYPE equipment_status AS ENUM (
  'disponivel',
  'em_uso',
  'em_manutencao',
  'indisponivel',
  'baixado'
);

CREATE TYPE purchase_status AS ENUM (
  'solicitacao',
  'aprovacao',
  'cotacao',
  'compra_realizada',
  'recebimento',
  'concluida',
  'cancelada'
);

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'visitante',
  department_id UUID,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_department_id ON profiles(department_id);

-- =============================================================================
-- DEPARTMENTS TABLE
-- =============================================================================

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  code TEXT UNIQUE,
  manager_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'ativa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_departments_name ON departments(name);

-- =============================================================================
-- SPACES TABLE
-- =============================================================================

CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name available_space NOT NULL UNIQUE,
  description TEXT,
  capacity INTEGER,
  location TEXT,
  amenities TEXT[],
  status TEXT DEFAULT 'disponivel',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spaces_name ON spaces(name);

-- Add foreign key to profiles for department
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- =============================================================================
-- DOCUMENTS TABLE
-- =============================================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uuid TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  control_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category document_category NOT NULL,
  status document_status NOT NULL DEFAULT 'ativo',
  responsible_id UUID REFERENCES profiles(id),
  responsible_name TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  validity_date DATE,
  version INTEGER DEFAULT 1,
  related_occurrence_id UUID,
  related_equipment_id UUID,
  related_purchase_id UUID,
  tags TEXT[],
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT control_id_format CHECK (control_id ~ '^[A-Z0-9]{2,}$')
);

CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_responsible_id ON documents(responsible_id);
CREATE INDEX idx_documents_validity_date ON documents(validity_date);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- =============================================================================
-- DOCUMENT VERSIONS TABLE
-- =============================================================================

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  changes_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version_number ON document_versions(document_id, version_number);

-- =============================================================================
-- OCCURRENCES TABLE
-- =============================================================================

CREATE TABLE occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurrence_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category occurrence_category NOT NULL,
  priority occurrence_priority NOT NULL DEFAULT 'media',
  status occurrence_status NOT NULL DEFAULT 'aberta',
  location TEXT NOT NULL,
  responsible_id UUID REFERENCES profiles(id),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  solution TEXT,
  evidence_url TEXT,
  evidence_file_type TEXT,
  deadline DATE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_occurrences_status ON occurrences(status);
CREATE INDEX idx_occurrences_priority ON occurrences(priority);
CREATE INDEX idx_occurrences_category ON occurrences(category);
CREATE INDEX idx_occurrences_responsible_id ON occurrences(responsible_id);
CREATE INDEX idx_occurrences_created_at ON occurrences(created_at);
CREATE INDEX idx_occurrences_deadline ON occurrences(deadline);

-- =============================================================================
-- OCCURRENCE COMMENTS TABLE
-- =============================================================================

CREATE TABLE occurrence_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurrence_id UUID NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_occurrence_comments_occurrence_id ON occurrence_comments(occurrence_id);
CREATE INDEX idx_occurrence_comments_author_id ON occurrence_comments(author_id);

-- =============================================================================
-- OCCURRENCE HISTORY TABLE
-- =============================================================================

CREATE TABLE occurrence_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurrence_id UUID NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status occurrence_status,
  new_status occurrence_status,
  old_priority occurrence_priority,
  new_priority occurrence_priority,
  change_description TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_occurrence_history_occurrence_id ON occurrence_history(occurrence_id);
CREATE INDEX idx_occurrence_history_created_at ON occurrence_history(created_at);

-- =============================================================================
-- EVENTS TABLE
-- =============================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL,
  space_id UUID NOT NULL REFERENCES spaces(id),
  responsible_id UUID REFERENCES profiles(id),
  requester_id UUID REFERENCES profiles(id),
  status event_status NOT NULL DEFAULT 'aguardando_aprovacao',
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER,
  attendance_list_created BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT time_check CHECK (start_time < end_time)
);

CREATE INDEX idx_events_space_id ON events(space_id);
CREATE INDEX idx_events_responsible_id ON events(responsible_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_created_at ON events(created_at);

-- =============================================================================
-- ATTENDANCE LIST TABLE
-- =============================================================================

CREATE TABLE attendance_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_email TEXT,
  participant_phone TEXT,
  qr_code TEXT UNIQUE,
  access_link TEXT UNIQUE,
  presence_confirmed BOOLEAN DEFAULT FALSE,
  presence_time TIMESTAMP WITH TIME ZONE,
  imported_from_csv BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attendance_event_id ON attendance_list(event_id);
CREATE INDEX idx_attendance_qr_code ON attendance_list(qr_code);
CREATE INDEX idx_attendance_access_link ON attendance_list(access_link);

-- =============================================================================
-- SUPPLIES TABLE
-- =============================================================================

CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category supply_category NOT NULL,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  status TEXT DEFAULT 'normal',
  description TEXT,
  supplier TEXT,
  unit_cost DECIMAL(10, 2),
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_supplies_category ON supplies(category);
CREATE INDEX idx_supplies_status ON supplies(status);
CREATE INDEX idx_supplies_code ON supplies(code);

-- =============================================================================
-- SUPPLY MOVEMENTS TABLE
-- =============================================================================

CREATE TABLE supply_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supply_id UUID NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida')),
  quantity_moved INTEGER NOT NULL,
  reason TEXT,
  requisition_id UUID,
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_supply_movements_supply_id ON supply_movements(supply_id);
CREATE INDEX idx_supply_movements_created_at ON supply_movements(created_at);
CREATE INDEX idx_supply_movements_movement_type ON supply_movements(movement_type);

-- =============================================================================
-- SUPPLIES REQUISITION TABLE
-- =============================================================================

CREATE TABLE supply_requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requisition_number TEXT UNIQUE NOT NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  approval_status TEXT NOT NULL DEFAULT 'pendente',
  approved_by UUID REFERENCES profiles(id),
  supplies_requested JSONB NOT NULL,
  justification TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_requisitions_requested_by ON supply_requisitions(requested_by);
CREATE INDEX idx_supply_requisitions_approval_status ON supply_requisitions(approval_status);

-- =============================================================================
-- PURCHASES TABLE
-- =============================================================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_number TEXT UNIQUE NOT NULL,
  supply_id UUID NOT NULL REFERENCES supplies(id),
  status purchase_status NOT NULL DEFAULT 'solicitacao',
  priority occurrence_priority NOT NULL DEFAULT 'media',
  solicitant_id UUID REFERENCES profiles(id),
  department_id UUID REFERENCES departments(id),
  estimated_value DECIMAL(12, 2),
  justification TEXT,
  purchase_document_number TEXT,
  fiscal_document_url TEXT,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_supply_id ON purchases(supply_id);
CREATE INDEX idx_purchases_solicitant_id ON purchases(solicitant_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);

-- =============================================================================
-- PURCHASE HISTORY TABLE
-- =============================================================================

CREATE TABLE purchase_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  old_status purchase_status,
  new_status purchase_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_history_purchase_id ON purchase_history(purchase_id);

-- =============================================================================
-- EQUIPMENTS TABLE
-- =============================================================================

CREATE TABLE equipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patrimonial_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  location TEXT NOT NULL,
  responsible_id UUID REFERENCES profiles(id),
  status equipment_status NOT NULL DEFAULT 'disponivel',
  acquisition_date DATE,
  next_maintenance DATE,
  image_url TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  is_low BOOLEAN DEFAULT FALSE,
  low_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_equipments_patrimonial_code ON equipments(patrimonial_code);
CREATE INDEX idx_equipments_status ON equipments(status);
CREATE INDEX idx_equipments_responsible_id ON equipments(responsible_id);
CREATE INDEX idx_equipments_location ON equipments(location);

-- =============================================================================
-- EQUIPMENT HISTORY TABLE
-- =============================================================================

CREATE TABLE equipment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status equipment_status,
  new_status equipment_status,
  old_location TEXT,
  new_location TEXT,
  old_responsible_id UUID REFERENCES profiles(id),
  new_responsible_id UUID REFERENCES profiles(id),
  description TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_equipment_history_equipment_id ON equipment_history(equipment_id);
CREATE INDEX idx_equipment_history_created_at ON equipment_history(created_at);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =============================================================================
-- SETTINGS TABLE
-- =============================================================================

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  is_system_setting BOOLEAN DEFAULT TRUE,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_key ON settings(setting_key);

-- =============================================================================
-- ACTIVITY LOG TABLE (for audit trail)
-- =============================================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrence_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrence_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: Users can only see their own profile, Admins can see all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'administrador'
  ));

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'administrador'
  ));

-- Documents RLS: Authenticated users can view, Admins and creators can edit
CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and creators can update documents"
  ON documents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('administrador', 'administracao')
  ) OR created_by = auth.uid());

-- Occurrences RLS
CREATE POLICY "Users can view occurrences"
  ON occurrences FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create occurrences"
  ON occurrences FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Events RLS
CREATE POLICY "Users can view events"
  ON events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authorized users can create events"
  ON events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('administrador', 'administracao', 'visitante')
  ));

-- Supplies RLS
CREATE POLICY "Users can view supplies"
  ON supplies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage supplies"
  ON supplies FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'administrador'
  ));

-- Purchases RLS
CREATE POLICY "Authorized users can view purchases"
  ON purchases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('administrador', 'administracao')
  ) OR solicitant_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Authorized users can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('administrador', 'administracao')
  ));

-- Equipments RLS
CREATE POLICY "Users can view equipments"
  ON equipments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage equipments"
  ON equipments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'administrador'
  ));

-- Notifications RLS
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_occurrences_updated_at BEFORE UPDATE ON occurrences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplies_updated_at BEFORE UPDATE ON supplies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipments_updated_at BEFORE UPDATE ON equipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check occurrence number format
CREATE OR REPLACE FUNCTION generate_occurrence_number()
RETURNS TEXT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM occurrences;
  RETURN 'OC' || LPAD((v_count + 1)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to check purchase number format
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS TEXT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM purchases;
  RETURN 'CP' || LPAD((v_count + 1)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to check supply requisition number format
CREATE OR REPLACE FUNCTION generate_supply_requisition_number()
RETURNS TEXT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM supply_requisitions;
  RETURN 'RQ' || LPAD((v_count + 1)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to update supply status based on quantity
CREATE OR REPLACE FUNCTION update_supply_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_quantity <= 0 THEN
    NEW.status = 'critico';
  ELSIF NEW.current_quantity <= NEW.minimum_quantity THEN
    NEW.status = 'baixo';
  ELSE
    NEW.status = 'normal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supply_status_trigger BEFORE UPDATE ON supplies
  FOR EACH ROW EXECUTE FUNCTION update_supply_status();

-- Function to create occurrence document automatically
CREATE OR REPLACE FUNCTION create_evidence_document_for_occurrence()
RETURNS TRIGGER AS $$
DECLARE
  v_doc_id UUID;
BEGIN
  IF NEW.evidence_url IS NOT NULL THEN
    INSERT INTO documents (
      title,
      description,
      category,
      status,
      file_url,
      file_type,
      related_occurrence_id,
      created_by
    ) VALUES (
      'Evidência - ' || NEW.title,
      'Evidência vinculada à ocorrência ' || NEW.occurrence_number,
      'ocorrencias',
      'ativo',
      NEW.evidence_url,
      NEW.evidence_file_type,
      NEW.id,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_evidence_doc_trigger AFTER INSERT ON occurrences
  FOR EACH ROW EXECUTE FUNCTION create_evidence_document_for_occurrence();
