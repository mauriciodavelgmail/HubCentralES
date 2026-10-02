import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'administrador' | 'administracao' | 'recepcao' | 'manutencao' | 'limpeza' | 'visitante';
  department_id: string;
  is_active: boolean;
}

// Sign Up
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
}

// Sign In
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Sign Out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get Current Session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// Get Current User
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// Get User Profile
export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  let query = supabase.from('profiles').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    const user = await getCurrentUser();
    if (!user) return null;
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    throw error;
  }

  return data as UserProfile;
}

// Listen to Auth State Changes
export function onAuthStateChange(
  callback: (user: AuthUser | null, profile: UserProfile | null) => void
) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await getUserProfile(session.user.id);
      callback(
        {
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: session.user.user_metadata,
        },
        profile
      );
    } else {
      callback(null, null);
    }
  });
}

// Reset Password
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
}

// Update Password
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
}
