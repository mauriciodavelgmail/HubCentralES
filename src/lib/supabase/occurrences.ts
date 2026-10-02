import { supabase } from './auth';

export interface Occurrence {
  id: string;
  occurrence_number: string;
  title: string;
  description: string;
  category: string;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'aberta' | 'em_analise' | 'em_execucao' | 'resolvida' | 'cancelada';
  location: string;
  solution?: string;
  deadline?: string;
  reporter_id: string;
  responsible_id?: string;
  created_at: string;
  updated_at: string;
}

export async function getOccurrences() {
  const { data, error } = await supabase
    .from('occurrences')
    .select('*, profiles!reporter_id(full_name, email), profiles!responsible_id(full_name, email)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as any[];
}

export async function getOccurrence(id: string) {
  const { data, error } = await supabase
    .from('occurrences')
    .select('*, profiles!reporter_id(full_name, email), profiles!responsible_id(full_name, email)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function createOccurrence(occurrence: Omit<Occurrence, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('occurrences')
    .insert([occurrence])
    .select()
    .single();

  if (error) throw error;
  return data as Occurrence;
}

export async function updateOccurrence(id: string, changes: Partial<Occurrence>) {
  const { data, error } = await supabase
    .from('occurrences')
    .update(changes)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Occurrence;
}

export async function deleteOccurrence(id: string) {
  const { error } = await supabase
    .from('occurrences')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getOccurrencesByStatus(status: string) {
  const { data, error } = await supabase
    .from('occurrences')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Occurrence[];
}

export async function getOccurrencesByPriority(priority: string) {
  const { data, error } = await supabase
    .from('occurrences')
    .select('*')
    .eq('priority', priority)
    .order('deadline', { ascending: true });

  if (error) throw error;
  return data as Occurrence[];
}

export async function searchOccurrences(query: string) {
  const { data, error } = await supabase
    .from('occurrences')
    .select('*')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Occurrence[];
}
