import { OccurrencePriority, OccurrenceStatus, DocumentStatus, EventStatus } from '@/types';

// Date formatting
export const formatDate = (date: string | Date, format: 'short' | 'long' = 'short'): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  if (format === 'short') {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatTime = (time: string): string => {
  if (!time) return '';
  return time.substring(0, 5);
};

export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const daysUntil = (date: string | Date): number => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const isExpired = (date: string | Date): boolean => {
  return new Date(date) < new Date();
};

export const isExpiring = (date: string | Date, daysThreshold: number = 30): boolean => {
  const days = daysUntil(date);
  return days >= 0 && days <= daysThreshold;
};

// Status formatting
export const statusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    aberta: 'Aberta',
    em_analise: 'Em análise',
    em_execucao: 'Em execução',
    resolvida: 'Resolvida',
    cancelada: 'Cancelada',
    confirmada: 'Confirmada',
    aguardando_aprovacao: 'Aguardando aprovação',
    realizada: 'Realizada',
    ativo: 'Ativo',
    vencendo: 'Vencendo',
    vencido: 'Vencido',
    arquivado: 'Arquivado',
    disponivel: 'Disponível',
    em_uso: 'Em uso',
    em_manutencao: 'Em manutenção',
    indisponivel: 'Indisponível',
    baixado: 'Baixado',
    solicitacao: 'Solicitação',
    aprovacao: 'Aprovação',
    cotacao: 'Cotação',
    compra_realizada: 'Compra realizada',
    recebimento: 'Recebimento',
    concluida: 'Concluída',
    normal: 'Normal',
    baixo: 'Baixo',
    critico: 'Crítico',
  };

  return labels[status] || status;
};

export const priorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    critica: 'Crítica',
  };

  return labels[priority] || priority;
};

// String formatting
export const truncate = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const toSnakeCase = (text: string): string => {
  return text
    .replace(/\s+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// File handling
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toUpperCase() || '';
};

export const getFileType = (filename: string): 'pdf' | 'image' | 'document' | 'other' => {
  const ext = getFileExtension(filename).toLowerCase();

  if (ext === 'PDF') return 'pdf';
  if (['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(ext)) return 'image';
  if (['DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX'].includes(ext)) return 'document';

  return 'other';
};

// Search/Filter helpers
export const searchFilter = (items: any[], searchTerm: string, fields: string[]): any[] => {
  if (!searchTerm) return items;

  const lowerSearch = searchTerm.toLowerCase();

  return items.filter((item) =>
    fields.some((field) => {
      const value = item[field]?.toString().toLowerCase();
      return value?.includes(lowerSearch);
    })
  );
};

export const filterByStatus = (items: any[], status: string[]): any[] => {
  if (!status || status.length === 0) return items;
  return items.filter((item) => status.includes(item.status));
};

// Intelligent occurrence suggestion (simulated AI)
export const getOccurrenceSugestions = (title: string, description: string) => {
  const keywordsMap: Record<string, { priority: OccurrencePriority; dept: string; deadline: number }> = {
    'ar condicionado': { priority: 'alta', dept: 'Manutenção', deadline: 1 },
    ar_cond: { priority: 'alta', dept: 'Manutenção', deadline: 1 },
    urgente: { priority: 'critica', dept: 'Manutenção', deadline: 1 },
    vazament: { priority: 'critica', dept: 'Manutenção', deadline: 1 },
    fogo: { priority: 'critica', dept: 'Segurança', deadline: 1 },
    segurança: { priority: 'alta', dept: 'Segurança', deadline: 2 },
    câmera: { priority: 'alta', dept: 'Tecnologia', deadline: 1 },
    internet: { priority: 'media', dept: 'Tecnologia', deadline: 2 },
    lâmpada: { priority: 'baixa', dept: 'Manutenção', deadline: 5 },
    limpeza: { priority: 'media', dept: 'Limpeza', deadline: 3 },
    evento: { priority: 'alta', dept: 'Eventos', deadline: 2 },
    mobiliário: { priority: 'media', dept: 'Manutenção', deadline: 3 },
    equipamento: { priority: 'media', dept: 'Manutenção', deadline: 3 },
  };

  const combinedText = `${title} ${description}`.toLowerCase();
  let suggestedPriority: OccurrencePriority = 'media';
  let suggestedDept = 'Administração';
  let deadline = 3;
  let confidence = 0.3;

  for (const [keyword, suggestion] of Object.entries(keywordsMap)) {
    if (combinedText.includes(keyword)) {
      suggestedPriority = suggestion.priority;
      suggestedDept = suggestion.dept;
      deadline = suggestion.deadline;
      confidence = Math.min(0.95, 0.5 + Object.keys(keywordsMap).filter((k) => combinedText.includes(k)).length * 0.1);
      break;
    }
  }

  return {
    suggestedPriority,
    suggestedDepartment: suggestedDept,
    suggestedDeadlineDays: deadline,
    confidence,
  };
};

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\d{2})\s?9?\d{4}-?\d{4}$/;
  return phoneRegex.test(phone);
};

export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;

  let sum = 0;
  let remainder;

  // First check digit
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  // Second check digit
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
};

// Array/Object helpers
export const groupBy = <T extends Record<string, any>>(items: T[], key: keyof T): Record<string, T[]> => {
  return items.reduce(
    (groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
      return groups;
    },
    {} as Record<string, T[]>
  );
};

export const sortBy = <T extends Record<string, any>>(items: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...items].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return order === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return order === 'asc' ? -1 : 1;

    const comparison = aVal < bVal ? -1 : 1;
    return order === 'asc' ? comparison : -comparison;
  });
};

export const uniqBy = <T extends Record<string, any>>(items: T[], key: keyof T): T[] => {
  const seen = new Set();
  return items.filter((item) => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// Deep clone
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Merge objects
export const mergeObjects = <T extends Record<string, any>>(target: T, source: Partial<T>): T => {
  return { ...target, ...source };
};
