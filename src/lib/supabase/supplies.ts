import { supabase } from './auth';

export interface Supply {
  id: string;
  code: string;
  name: string;
  category: string;
  current_quantity: number;
  minimum_quantity: number;
  unit: string;
  status: 'normal' | 'baixo' | 'critico';
  supplier?: string;
  unit_cost?: number;
  description?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export async function getSupplies() {
  const { data, error } = await supabase
    .from('supplies')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Supply[];
}

export async function getSupply(id: string) {
  const { data, error } = await supabase
    .from('supplies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Supply;
}

export async function createSupply(supply: Omit<Supply, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('supplies')
    .insert([supply])
    .select()
    .single();

  if (error) throw error;
  return data as Supply;
}

export async function updateSupply(id: string, changes: Partial<Supply>) {
  const { data, error } = await supabase
    .from('supplies')
    .update(changes)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Supply;
}

export async function deleteSupply(id: string) {
  const { error } = await supabase
    .from('supplies')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getSuppliesByCritical() {
  const { data, error } = await supabase
    .from('supplies')
    .select('*')
    .eq('status', 'critico')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Supply[];
}

export async function getSuppliesByCategory(category: string) {
  const { data, error } = await supabase
    .from('supplies')
    .select('*')
    .eq('category', category)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Supply[];
}

export async function searchSupplies(query: string) {
  const { data, error } = await supabase
    .from('supplies')
    .select('*')
    .or(`name.ilike.%${query}%,code.ilike.%${query}%,supplier.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Supply[];
}
