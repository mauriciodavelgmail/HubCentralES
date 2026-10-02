import { supabase } from './auth';

export interface Equipment {
  id: string;
  patrimonial_code: string;
  name: string;
  description?: string;
  category?: string;
  location: string;
  responsible_id?: string;
  status: 'disponivel' | 'em_uso' | 'em_manutencao' | 'indisponivel' | 'baixado';
  acquisition_date?: string;
  next_maintenance?: string;
  image_url?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  is_low: boolean;
  created_at: string;
  updated_at: string;
}

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
