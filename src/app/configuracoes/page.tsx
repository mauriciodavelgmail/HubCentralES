'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, LoadingSpinner } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/auth';
import { USER_ROLES } from '@/constants';
import { KeyRound, Pencil, Plus, RefreshCw, ShieldAlert, UserCog } from 'lucide-react';
import type { Database } from '@/lib/supabase/database.types';

type Role = Database['public']['Tables']['profiles']['Row']['role'];
type ManagedUser = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'user_id' | 'email' | 'full_name' | 'role' | 'is_active'>;

export default function ConfiguracoesPage() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'visitante' as Role });
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', role: 'visitante' as Role });

  const apiRequest = useCallback(async (options?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente.');
    const response = await fetch('/api/admin/users', {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options?.headers },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Falha na operação');
    return result;
  }, []);

  const loadUsers = useCallback(async () => {
    if (profile?.role !== 'administrador') { setLoading(false); return; }
    try {
      setLoading(true);
      setFeedback(null);
      const result = await apiRequest();
      setUsers(result.users);
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao carregar usuários' });
    } finally { setLoading(false); }
  }, [apiRequest, profile?.role]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const updateUser = async (profileId: string, changes: { role?: Role; isActive?: boolean; password?: string; email?: string; fullName?: string }) => {
    try {
      setSavingId(profileId);
      setFeedback(null);
      await apiRequest({ method: 'PATCH', body: JSON.stringify({ profileId, ...changes }) });
      setFeedback({ type: 'success', text: changes.password ? 'Senha redefinida com sucesso.' : 'Usuário atualizado com sucesso.' });
      if (!changes.password) await loadUsers();
      return true;
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao atualizar usuário' });
      return false;
    } finally { setSavingId(null); }
  };

  const resetPassword = (managedUser: ManagedUser) => {
    const password = window.prompt(`Nova senha para ${managedUser.email} (mínimo de 8 caracteres):`);
    if (password !== null) updateUser(managedUser.id, { password });
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setCreating(true);
      setFeedback(null);
      await apiRequest({ method: 'POST', body: JSON.stringify(newUser) });
      setShowCreate(false);
      setNewUser({ fullName: '', email: '', password: '', role: 'visitante' });
      setFeedback({ type: 'success', text: 'Usuário criado com sucesso.' });
      await loadUsers();
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao criar usuário' });
    } finally { setCreating(false); }
  };

  const openEdit = (managedUser: ManagedUser) => {
    setEditingUser(managedUser);
    setEditForm({ fullName: managedUser.full_name || '', email: managedUser.email, role: managedUser.role });
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    if (await updateUser(editingUser.id, editForm)) setEditingUser(null);
  };

  return (
    <ProtectedRoute>
      <MainLayout title="Configurações" subtitle="Administração do sistema">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div><h1 className="text-2xl font-bold text-gray-900">Gestão de usuários</h1><p className="text-gray-600 mt-1">Gerencie funções, acessos e senhas.</p></div>
            {profile?.role === 'administrador' && <div className="flex gap-2">
              <Button variant="outline" onClick={loadUsers} icon={<RefreshCw size={16} />}>Atualizar</Button>
              <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>Novo usuário</Button>
            </div>}
          </div>

          {profile?.role !== 'administrador' ? (
            <Alert variant="warning" title="Acesso restrito"><span className="inline-flex items-center gap-2"><ShieldAlert size={18} />Somente administradores podem gerenciar usuários.</span></Alert>
          ) : (
            <>
              {feedback && <Alert variant={feedback.type === 'error' ? 'destructive' : 'success'}>{feedback.text}</Alert>}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><UserCog size={20} />Usuários</CardTitle></CardHeader>
                <CardContent>
                  {loading ? <div className="flex justify-center py-10"><LoadingSpinner /></div> : users.length === 0 ? <p className="text-center text-gray-500 py-8">Nenhum usuário encontrado.</p> : (
                    <div className="overflow-x-auto"><table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-gray-600"><th className="px-3 py-3">Usuário</th><th className="px-3 py-3">Perfil</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Ações</th></tr></thead>
                      <tbody>{users.map((managedUser) => <tr key={managedUser.id} className="border-b last:border-0">
                        <td className="px-3 py-3"><p className="font-medium">{managedUser.full_name || 'Sem nome'}</p><p className="text-xs text-gray-500">{managedUser.email}</p>{!managedUser.user_id && <p className="text-xs text-orange-600">Não vinculado ao Authentication</p>}</td>
                        <td className="px-3 py-3"><select className="border rounded-lg px-2 py-2 bg-white" value={managedUser.role} disabled={savingId === managedUser.id} onChange={(event) => updateUser(managedUser.id, { role: event.target.value as Role })}>{USER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></td>
                        <td className="px-3 py-3"><Badge variant={managedUser.is_active ? 'success' : 'secondary'}>{managedUser.is_active ? 'Ativo' : 'Inativo'}</Badge></td>
                        <td className="px-3 py-3"><div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" icon={<Pencil size={15} />} disabled={savingId === managedUser.id} onClick={() => openEdit(managedUser)}>Editar</Button>
                          <Button variant="outline" size="sm" icon={<KeyRound size={15} />}
                            title={managedUser.user_id === user?.id ? 'Use a recuperação de senha para alterar sua própria senha' : undefined}
                            disabled={!managedUser.user_id || managedUser.user_id === user?.id || savingId === managedUser.id}
                            onClick={() => resetPassword(managedUser)}>Redefinir senha</Button>
                          <Button variant={managedUser.is_active ? 'danger' : 'secondary'} size="sm" disabled={managedUser.user_id === user?.id || savingId === managedUser.id} onClick={() => updateUser(managedUser.id, { isActive: !managedUser.is_active })}>{managedUser.is_active ? 'Desativar' : 'Ativar'}</Button>
                        </div></td>
                      </tr>)}</tbody>
                    </table></div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
            <form onSubmit={createUser} className="space-y-4">
              <Input label="Nome completo" value={newUser.fullName} onChange={(event) => setNewUser({ ...newUser, fullName: event.target.value })} required />
              <Input label="E-mail" type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} required />
              <Input label="Senha inicial" type="password" minLength={8} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} required />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as Role })}>
                  {USER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button><Button type="submit" loading={creating}>Criar usuário</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
            <form onSubmit={saveEdit} className="space-y-4">
              <Input label="Nome completo" value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} required />
              <Input label="E-mail" type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} required />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value as Role })}>
                  {USER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button><Button type="submit" loading={savingId === editingUser?.id}>Salvar alterações</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
