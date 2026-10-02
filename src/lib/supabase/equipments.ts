import { supabase } from './auth';
import { Database } from './database.types';

export type Equipment = Database['public']['Tables']['equipments']['Row'];

export async function getEquipments() {
  const { data, error } = await supabase
    .from('equipments')
    .select('*, profiles(full_name, email)')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as any[];
}

export async function getEquipment(id: string) {
  const { data, error } = await supabase
    .from('equipments')
    .select('*, profiles(full_name, email, department_id, department_name)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function createEquipment(equipment: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('equipments')
    .insert([equipment])
    .select()
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function updateEquipment(id: string, changes: Partial<Equipment>) {
  const { data, error } = await supabase
    .from('equipments')
    .update(changes)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function deleteEquipment(id: string) {
  const { error } = await supabase
    .from('equipments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getEquipmentsByStatus(status: string) {
  const { data, error } = await supabase
    .from('equipments')
    .select('*')
    .eq('status', status)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Equipment[];
}

export async function getEquipmentsByLocation(location: string) {
  const { data, error } = await supabase
    .from('equipments')
    .select('*')
    .eq('location', location)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Equipment[];
}

export async function searchEquipments(query: string) {
  const { data, error } = await supabase
    .from('equipments')
    .select('*')
    .or(`name.ilike.%${query}%,patrimonial_code.ilike.%${query}%,manufacturer.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Equipment[];
}
