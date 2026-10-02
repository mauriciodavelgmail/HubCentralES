import { supabase } from './auth';

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  space_id: string;
  responsible_id?: string;
  requester_id?: string;
  status: 'aguardando_aprovacao' | 'confirmada' | 'cancelada' | 'realizada';
  start_date: string;
  start_time: string;
  end_time: string;
  capacity?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*, spaces(name, capacity, amenities)')
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data as any[];
}

export async function getEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*, spaces(name, capacity, amenities, location)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function updateEvent(id: string, changes: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .update(changes)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getEventsBySpace(spaceId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('space_id', spaceId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data as Event[];
}

export async function getEventsByStatus(status: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', status)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data as Event[];
}
