import { supabase } from './auth';
import { Database } from './database.types';

export type Occurrence = Database['public']['Tables']['occurrences']['Row'];

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
