import { supabase } from './auth';

export interface Document {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: 'ativo' | 'vencendo' | 'vencido' | 'arquivado';
  file_url: string;
  file_type: string;
  validity_date?: string;
  version: number;
  tags?: string[];
  control_id: string;
  responsible_id?: string;
  created_at: string;
  updated_at: string;
}

export async function getDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Document[];
}

export async function getDocument(id: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Document;
}

export async function createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('documents')
    .insert([document])
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

export async function updateDocument(id: string, changes: Partial<Document>) {
  const { data, error } = await supabase
    .from('documents')
    .update(changes)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function searchDocuments(query: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cd.{${query}}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Document[];
}
