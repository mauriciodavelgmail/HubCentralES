import { supabase } from './auth';
import { Database } from './database.types';

export type Event = Database['public']['Tables']['events']['Row'];

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
