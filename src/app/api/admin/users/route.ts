import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Configuração administrativa do Supabase ausente');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authorize(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const supabase = getAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('user_id', user.id).single();
  if (!profile || profile.role !== 'administrador' || !profile.is_active) return null;
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (!auth) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    const { data, error } = await auth.supabase.from('profiles')
      .select('id, user_id, email, full_name, role, is_active, created_at').order('full_name');
    if (error) throw error;
    return NextResponse.json({ users: data });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ error: 'Não foi possível carregar os usuários' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (!auth) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    const { profileId, role, isActive, password } = await request.json();
    if (!profileId) return NextResponse.json({ error: 'Usuário não informado' }, { status: 400 });

    const { data: target } = await auth.supabase.from('profiles').select('user_id').eq('id', profileId).single();
    if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    if (role !== undefined || isActive !== undefined) {
      const changes: Database['public']['Tables']['profiles']['Update'] = {};
      if (role !== undefined) changes.role = role;
      if (isActive !== undefined) changes.is_active = isActive;
      const { error } = await auth.supabase.from('profiles').update(changes).eq('id', profileId);
      if (error) throw error;
    }

    if (password !== undefined) {
      if (password.length < 8) return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres' }, { status: 400 });
      if (!target.user_id) return NextResponse.json({ error: 'Perfil não vinculado ao Authentication' }, { status: 400 });
      const { error } = await auth.supabase.auth.admin.updateUserById(target.user_id, { password });
      if (error) throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Não foi possível atualizar o usuário' }, { status: 500 });
  }
}
