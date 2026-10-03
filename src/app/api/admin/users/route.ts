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
  if (!token) return { error: 'Sessão não informada', status: 401 } as const;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Configuração pública do Supabase ausente');

  // Validate the user's JWT with the public Auth client. The service-role
  // client is reserved for the privileged database/admin operations below.
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) return { error: 'Sessão inválida ou expirada', status: 401 } as const;

  const supabase = getAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role, is_active').eq('user_id', user.id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return { error: 'Usuário sem perfil vinculado. Verifique profiles.user_id.', status: 403 } as const;
  if (!profile.is_active) return { error: 'Este usuário está inativo', status: 403 } as const;
  if (profile.role !== 'administrador') return { error: 'Apenas administradores podem gerenciar usuários', status: 403 } as const;
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { data, error } = await auth.supabase.from('profiles')
      .select('id, user_id, email, full_name, role, is_active, created_at').order('full_name');
    if (error) throw error;
    return NextResponse.json({ users: data });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ error: 'Não foi possível carregar os usuários' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { email, password, fullName, role } = await request.json();
    const validRoles = ['administrador', 'administracao', 'recepcao', 'manutencao', 'limpeza', 'visitante'];
    if (!email || !fullName || !password || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Preencha nome, e-mail, senha e perfil' }, { status: 400 });
    }
    if (password.length < 8) return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres' }, { status: 400 });

    const normalizedEmail = String(email).trim().toLowerCase();
    const { data: created, error: createError } = await auth.supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: String(fullName).trim() },
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message || 'Não foi possível criar o usuário' }, { status: createError?.status || 400 });
    }

    const { data: existing } = await auth.supabase.from('profiles').select('id').ilike('email', normalizedEmail).maybeSingle();
    const profileData = { user_id: created.user.id, email: normalizedEmail, full_name: String(fullName).trim(), role, is_active: true };
    const profileResult = existing
      ? await auth.supabase.from('profiles').update(profileData).eq('id', existing.id)
      : await auth.supabase.from('profiles').insert(profileData);

    if (profileResult.error) {
      await auth.supabase.auth.admin.deleteUser(created.user.id);
      throw profileResult.error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: 'Não foi possível criar o usuário' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
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
      if (target.user_id === auth.user.id) {
        return NextResponse.json({ error: 'Use a recuperação de senha para alterar a senha do próprio administrador' }, { status: 400 });
      }
      const { data: authUser, error: lookupError } = await auth.supabase.auth.admin.getUserById(target.user_id);
      if (lookupError || !authUser.user) {
        return NextResponse.json({ error: 'O perfil não corresponde a um usuário válido no Authentication' }, { status: 404 });
      }
      const { error } = await auth.supabase.auth.admin.updateUserById(target.user_id, { password });
      if (error) {
        console.error('Erro do Supabase ao redefinir senha:', error);
        return NextResponse.json({ error: error.message || 'O Supabase recusou a nova senha' }, { status: error.status || 400 });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Não foi possível atualizar o usuário' }, { status: 500 });
  }
}
