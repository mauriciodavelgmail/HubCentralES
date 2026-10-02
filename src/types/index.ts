// =============================================================================
// ENUMS AND TYPES
// =============================================================================

export type UserRole = 'administrador' | 'administracao' | 'recepcao' | 'manutencao' | 'limpeza' | 'visitante';

export type OccurrenceStatus = 'aberta' | 'em_analise' | 'em_execucao' | 'resolvida' | 'cancelada';
export type OccurrencePriority = 'baixa' | 'media' | 'alta' | 'critica';
export type OccurrenceCategory = 'infraestrutura' | 'limpeza' | 'equipamentos' | 'evento' | 'seguranca' | 'tecnologia' | 'manutencao' | 'outros';

export type DocumentStatus = 'ativo' | 'vencendo' | 'vencido' | 'arquivado';
export type DocumentCategory = 
  | 'contratos'
  | 'editais'
  | 'pops'
  | 'atas'
  | 'normas'
  | 'relatorios'
  | 'comunicacao_institucional'
  | 'ocorrencias'
  | 'documentos_fiscais'
  | 'patrimonio';

export type EventStatus = 'aguardando_aprovacao' | 'confirmada' | 'cancelada' | 'realizada';
export type EventType = 'workshop' | 'palestra' | 'encontro' | 'reuniao' | 'outros';
export type AvailableSpace = 'auditorio' | 'lab_maker' | 'sala_criativa' | 'coworking' | 'hall' | 'espaco_multiuso';

export type SupplyCategory = 'limpeza' | 'escritorio' | 'evento' | 'manutencao' | 'tecnologia' | 'consumo';
export type EquipmentStatus = 'disponivel' | 'em_uso' | 'em_manutencao' | 'indisponivel' | 'baixado';
export type PurchaseStatus = 'solicitacao' | 'aprovacao' | 'cotacao' | 'compra_realizada' | 'recebimento' | 'concluida' | 'cancelada';

// =============================================================================
// MAIN ENTITIES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  department_id?: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  code?: string;
  manager_id?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Space {
  id: string;
  name: AvailableSpace;
  description?: string;
  capacity?: number;
  location?: string;
  amenities?: string[];
  status: string;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  uuid: string;
  control_id: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  status: DocumentStatus;
  responsible_id?: string;
  responsible_name?: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  validity_date?: Date;
  version: number;
  related_occurrence_id?: string;
  related_equipment_id?: string;
  related_purchase_id?: string;
  tags?: string[];
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_size?: number;
  changes_description?: string;
  created_at: Date;
  created_by?: string;
}

export interface Occurrence {
  id: string;
  occurrence_number: string;
  title: string;
  description: string;
  category: OccurrenceCategory;
  priority: OccurrencePriority;
  status: OccurrenceStatus;
  location: string;
  responsible_id?: string;
  reporter_id: string;
  solution?: string;
  evidence_url?: string;
  evidence_file_type?: string;
  deadline?: Date;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface OccurrenceComment {
  id: string;
  occurrence_id: string;
  author_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface OccurrenceHistory {
  id: string;
  occurrence_id: string;
  action: string;
  old_status?: OccurrenceStatus;
  new_status?: OccurrenceStatus;
  old_priority?: OccurrencePriority;
  new_priority?: OccurrencePriority;
  change_description?: string;
  changed_by: string;
  created_at: Date;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: EventType;
  space_id: string;
  responsible_id: string;
  requester_id: string;
  status: EventStatus;
  start_date: Date;
  start_time: string;
  end_time: string;
  capacity?: number;
  attendance_list_created: boolean;
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface AttendanceList {
  id: string;
  event_id: string;
  participant_name: string;
  participant_email?: string;
  participant_phone?: string;
  qr_code?: string;
  access_link?: string;
  presence_confirmed: boolean;
  presence_time?: Date;
  imported_from_csv: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Supply {
  id: string;
  code: string;
  name: string;
  category: SupplyCategory;
  current_quantity: number;
  minimum_quantity: number;
  unit: string;
  status: string;
  description?: string;
  supplier?: string;
  unit_cost?: number;
  location?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface SupplyMovement {
  id: string;
  supply_id: string;
  movement_type: 'entrada' | 'saida';
  quantity_moved: number;
  reason?: string;
  requisition_id?: string;
  requested_by?: string;
  approved_by?: string;
  created_at: Date;
  created_by?: string;
}

export interface SupplyRequisition {
  id: string;
  requisition_number: string;
  requested_by: string;
  approval_status: string;
  approved_by?: string;
  supplies_requested: Record<string, any>;
  justification?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supply_id: string;
  status: PurchaseStatus;
  priority: OccurrencePriority;
  solicitant_id: string;
  department_id?: string;
  estimated_value?: number;
  justification?: string;
  purchase_document_number?: string;
  fiscal_document_url?: string;
  received_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface PurchaseHistory {
  id: string;
  purchase_id: string;
  old_status?: PurchaseStatus;
  new_status: PurchaseStatus;
  changed_by: string;
  notes?: string;
  created_at: Date;
}

export interface Equipment {
  id: string;
  patrimonial_code: string;
  name: string;
  description?: string;
  category?: string;
  location: string;
  responsible_id?: string;
  status: EquipmentStatus;
  acquisition_date?: Date;
  next_maintenance?: Date;
  image_url?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  is_low: boolean;
  low_date?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface EquipmentHistory {
  id: string;
  equipment_id: string;
  action: string;
  old_status?: EquipmentStatus;
  new_status?: EquipmentStatus;
  old_location?: string;
  new_location?: string;
  old_responsible_id?: string;
  new_responsible_id?: string;
  description?: string;
  changed_by: string;
  created_at: Date;
}

export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_read: boolean;
  read_at?: Date;
  action_url?: string;
  created_at: Date;
}

export interface Setting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  description?: string;
  is_system_setting: boolean;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// =============================================================================
// UI/REQUEST TYPES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
}

// =============================================================================
// DASHBOARD METRICS
// =============================================================================

export interface DashboardMetrics {
  totalOccurrences: number;
  openOccurrences: number;
  criticalOccurrences: number;
  averageResolutionTime: number;
  totalEvents: number;
  upcomingEvents: number;
  totalDocuments: number;
  expiredDocuments: number;
  purchasesInProgress: number;
  lowStockItems: number;
}

export interface OccurrenceStats {
  byCategory: Record<OccurrenceCategory, number>;
  byPriority: Record<OccurrencePriority, number>;
  byStatus: Record<OccurrenceStatus, number>;
}

export interface EventStats {
  bySpace: Record<string, number>;
  byMonth: Record<string, number>;
  byStatus: Record<EventStatus, number>;
}

// =============================================================================
// AI SUGGESTION TYPES
// =============================================================================

export interface IntelligentSuggestion {
  suggestedPriority: OccurrencePriority;
  suggestedDepartment?: string;
  suggestedResponsible?: string;
  suggestedDeadlineDays: number;
  similarOccurrences: Occurrence[];
  confidence: number;
}
