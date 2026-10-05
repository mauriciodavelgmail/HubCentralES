// Colors and styling constants
export const COLORS = {
  primary: '#0057B8',
  primaryDark: '#003A70',
  secondary: '#FF6B1A',
  accent: '#FFD23F',
  danger: '#EF4E36',
  success: '#00A86B',
  info: '#35BCEB',
  warning: '#FFD23F',
  pink: '#E83E8C',
  light: '#F8F5EF',
  dark: '#1F2933',
  gray: '#6B7280',
};

export const STATUS_COLORS = {
  aberta: 'bg-yellow-100 text-yellow-800',
  em_analise: 'bg-blue-100 text-blue-800',
  em_execucao: 'bg-blue-100 text-blue-800',
  resolvida: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  confirmada: 'bg-green-100 text-green-800',
  aguardando_aprovacao: 'bg-yellow-100 text-yellow-800',
  realizada: 'bg-green-100 text-green-800',
};

export const PRIORITY_COLORS = {
  baixa: 'bg-green-100 text-green-800',
  media: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-orange-100 text-orange-800',
  critica: 'bg-red-100 text-red-800',
};

export const PRIORITY_ORDER = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

// Occurrence categories
export const OCCURRENCE_CATEGORIES = [
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'evento', label: 'Evento' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outros', label: 'Outros' },
];

export const DOCUMENT_CATEGORIES = [
  { value: 'contratos', label: 'Contratos' },
  { value: 'editais', label: 'Editais' },
  { value: 'pops', label: 'POPs' },
  { value: 'atas', label: 'Atas' },
  { value: 'normas', label: 'Normas' },
  { value: 'relatorios', label: 'Relatórios' },
  { value: 'comunicacao_institucional', label: 'Comunicação Institucional' },
  { value: 'ocorrencias', label: 'Ocorrências' },
  { value: 'documentos_fiscais', label: 'Documentos Fiscais' },
  { value: 'patrimonio', label: 'Patrimônio' },
];

export const SUPPLY_CATEGORIES = [
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'escritorio', label: 'Escritório' },
  { value: 'evento', label: 'Evento' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'consumo', label: 'Consumo' },
];

export const SPACES = [
  { value: 'auditorio', label: 'Auditório' },
  { value: 'lab_maker', label: 'Lab Maker' },
  { value: 'sala_criativa', label: 'Sala Criativa' },
  { value: 'coworking', label: 'Coworking' },
  { value: 'hall', label: 'Hall' },
  { value: 'espaco_multiuso', label: 'Espaço Multiuso' },
];

export const USER_ROLES = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'administracao', label: 'Administração' },
  { value: 'recepcao', label: 'Recepção' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'visitante', label: 'Visitante' },
];

export const EQUIPMENT_STATUS = [
  { value: 'disponivel', label: 'Disponível', color: 'bg-green-100 text-green-800' },
  { value: 'em_uso', label: 'Em uso', color: 'bg-blue-100 text-blue-800' },
  { value: 'em_manutencao', label: 'Em manutenção', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'indisponivel', label: 'Indisponível', color: 'bg-red-100 text-red-800' },
  { value: 'baixado', label: 'Baixado', color: 'bg-gray-100 text-gray-800' },
];

export const PURCHASE_STATUS_FLOW = [
  { value: 'solicitacao', label: 'Solicitação' },
  { value: 'aprovacao', label: 'Aprovação' },
  { value: 'cotacao', label: 'Cotação' },
  { value: 'compra_realizada', label: 'Compra Realizada' },
  { value: 'recebimento', label: 'Recebimento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

// Events
export const EVENT_TYPES = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'palestra', label: 'Palestra' },
  { value: 'encontro', label: 'Encontro' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'outros', label: 'Outros' },
];

export const EVENT_STATUS = [
  { value: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'realizada', label: 'Realizada' },
];

// Sidebar menu items
export const SIDEBAR_MENU = [
  {
    icon: 'LayoutDashboard',
    label: 'Dashboard',
    href: '/dashboard',
    roles: ['administrador', 'administracao', 'recepcao', 'manutencao', 'limpeza'],
  },
  {
    icon: 'AlertCircle',
    label: 'Ocorrências',
    href: '/ocorrencias',
    roles: ['administrador', 'administracao', 'recepcao', 'manutencao', 'limpeza'],
  },
  {
    icon: 'FileText',
    label: 'Documentos',
    href: '/documentos',
    roles: ['administrador', 'administracao'],
  },
  {
    icon: 'Calendar',
    label: 'Agenda',
    href: '/agenda',
    roles: ['administrador', 'administracao', 'recepcao', 'visitante'],
  },
  {
    icon: 'Users',
    label: 'Recepção de Eventos',
    href: '/recepcao',
    roles: ['administrador', 'recepcao'],
  },
  {
    icon: 'Package',
    label: 'Insumos',
    href: '/insumos',
    roles: ['administrador', 'administracao', 'manutencao', 'limpeza'],
  },
  {
    icon: 'ShoppingCart',
    label: 'Compras',
    href: '/compras',
    roles: ['administrador', 'administracao'],
  },
  {
    icon: 'Wrench',
    label: 'Equipamentos',
    href: '/equipamentos',
    roles: ['administrador', 'administracao', 'manutencao'],
  },
  {
    icon: 'BarChart3',
    label: 'Relatórios',
    href: '/relatorios',
    roles: ['administrador', 'administracao'],
  },
  {
    icon: 'Settings',
    label: 'Configurações',
    href: '/configuracoes',
    roles: ['administrador'],
  },
  {
    icon: 'FileStack',
    label: 'Gestão Documental',
    href: '/gestaodoc',
    roles: ['administrador', 'administracao'],
  },
  {
    icon: 'HandshakeIcon',
    label: 'Contratos',
    href: '/contratos',
    roles: ['administrador', 'administracao'],
  },
];

// Permissions matrix
export const PERMISSIONS = {
  administrador: {
    canCreateOccurrence: true,
    canEditOccurrence: true,
    canDeleteOccurrence: true,
    canViewAllOccurrences: true,
    canApproveEvent: true,
    canManageUsers: true,
    canManageSupplies: true,
    canManagePurchases: true,
    canViewReports: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
  },
  administracao: {
    canCreateOccurrence: true,
    canEditOccurrence: true,
    canDeleteOccurrence: false,
    canViewAllOccurrences: true,
    canApproveEvent: false,
    canManageUsers: false,
    canManageSupplies: false,
    canManagePurchases: true,
    canViewReports: true,
    canUploadDocuments: true,
    canDeleteDocuments: false,
  },
  recepcao: {
    canCreateOccurrence: false,
    canEditOccurrence: false,
    canDeleteOccurrence: false,
    canViewAllOccurrences: false,
    canApproveEvent: false,
    canManageUsers: false,
    canManageSupplies: false,
    canManagePurchases: false,
    canViewReports: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
  },
  manutencao: {
    canCreateOccurrence: true,
    canEditOccurrence: true,
    canDeleteOccurrence: false,
    canViewAllOccurrences: false,
    canApproveEvent: false,
    canManageUsers: false,
    canManageSupplies: false,
    canManagePurchases: false,
    canViewReports: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
  },
  limpeza: {
    canCreateOccurrence: true,
    canEditOccurrence: true,
    canDeleteOccurrence: false,
    canViewAllOccurrences: false,
    canApproveEvent: false,
    canManageUsers: false,
    canManageSupplies: false,
    canManagePurchases: false,
    canViewReports: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
  },
  visitante: {
    canCreateOccurrence: false,
    canEditOccurrence: false,
    canDeleteOccurrence: false,
    canViewAllOccurrences: false,
    canApproveEvent: false,
    canManageUsers: false,
    canManageSupplies: false,
    canManagePurchases: false,
    canViewReports: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
  },
};

// Page titles and descriptions
export const PAGE_CONTENT = {
  dashboard: {
    title: 'Dashboard',
    description: 'Visão geral da operação do HUB ES+',
  },
  occurrences: {
    title: 'Ocorrências',
    description: 'Gestão de ocorrências técnicas e operacionais',
  },
  documents: {
    title: 'Documentos',
    description: 'Gestão centralizada de documentos',
  },
  agenda: {
    title: 'Agenda de Eventos',
    description: 'Agendamento e gestão de espaços',
  },
  supplies: {
    title: 'Insumos e Equipamentos',
    description: 'Controle de estoque e equipamentos',
  },
  purchases: {
    title: 'Compras',
    description: 'Fluxo de compras e aquisições',
  },
  equipments: {
    title: 'Patrimônio',
    description: 'Gestão de equipamentos e patrimônio',
  },
  reports: {
    title: 'Relatórios',
    description: 'Análise de dados e indicadores',
  },
  settings: {
    title: 'Configurações',
    description: 'Administração do sistema',
  },
};
