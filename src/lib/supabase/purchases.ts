import { supabase } from './auth';
import { Database } from './database.types';

export type Purchase = Database['public']['Tables']['purchases']['Row'];

export async function getPurchases() {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, supplies(name, code, category), profiles(full_name, email)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as any[];
}

export async function getPurchase(id: string) {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, supplies(name, code, category, unit_cost), profiles(full_name, email, department_id)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function createPurchase(purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('purchases')
    .insert([purchase])
    .select()
    .single();

  if (error) throw error;
  return data as Purchase;
}

export async function updatePurchase(id: string, changes: Partial<Purchase>) {
  const { data, error } = await supabase
    .from('purchases')
    .update(changes)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Purchase;
}

export async function deletePurchase(id: string) {
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getPurchasesByStatus(status: string) {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, supplies(name, code)')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as any[];
}

export async function getPurchasesByPriority(priority: string) {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('priority', priority)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Purchase[];
}

export async function searchPurchases(query: string) {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, supplies(name, code)')
    .or(`purchase_number.ilike.%${query}%,justification.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as any[];
}
