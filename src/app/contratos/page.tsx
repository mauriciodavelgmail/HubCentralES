'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit2, FileText, Plus, RefreshCw, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { MainLayout } from '@/components/layout';
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, EmptyState, Input, LoadingSpinner } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/auth';

const contractSchema = z.object({
  contract_number: z.string().trim().min(3, 'Informe o número do contrato.'),
  supplier: z.string().trim().min(2, 'Informe o fornecedor.'),
  subject: z.string().trim().min(3, 'Informe o objeto do contrato.'),
  description: z.string().trim().optional(),
  start_date: z.string().min(1, 'Informe a data inicial.'),
  end_date: z.string().min(1, 'Informe a data final.'),
  value: z.string().optional(),
  status: z.enum(['rascunho', 'ativo', 'vencendo', 'vencido', 'encerrado', 'cancelado']),
}).refine((data) => data.start_date <= data.end_date, { message: 'A vigência final deve ser posterior à inicial.', path: ['end_date'] });

type ContractForm = z.infer<typeof contractSchema>;
interface Contract extends Omit<ContractForm, 'value'> { id: string; value: number | null; created_at: string; }

const DEFAULT_VALUES: ContractForm = { contract_number: '', supplier: '', subject: '', description: '', start_date: '', end_date: '', value: '', status: 'ativo' };
const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'secondary' | 'info'> = { ativo: 'success', vencendo: 'warning', vencido: 'danger', cancelado: 'danger', encerrado: 'secondary', rascunho: 'info' };

export default function ContratosPage() {
  const { user, profile } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const form = useForm<ContractForm>({ resolver: zodResolver(contractSchema), defaultValues: DEFAULT_VALUES });

  const loadContracts = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: loadError } = await supabase.from('contracts').select('*').order('end_date', { ascending: true });
    if (loadError) setError(loadError.code === '42P01' ? 'A migration 006_contracts.sql ainda não foi aplicada no Supabase.' : loadError.message);
    else setContracts((data ?? []) as Contract[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadContracts(); }, [loadContracts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? contracts.filter((item) => `${item.contract_number} ${item.supplier} ${item.subject}`.toLowerCase().includes(query)) : contracts;
  }, [contracts, search]);

  const openCreate = () => { setEditing(null); form.reset(DEFAULT_VALUES); setDialogOpen(true); };
  const openEdit = (contract: Contract) => {
    setEditing(contract);
    form.reset({ ...contract, description: contract.description ?? '', value: contract.value == null ? '' : String(contract.value) });
    setDialogOpen(true);
  };

  const saveContract = form.handleSubmit(async (values) => {
    setSaving(true); setError(null);
    const payload = { ...values, value: values.value ? Number(values.value.replace(',', '.')) : null, updated_by: user?.id, ...(!editing ? { created_by: user?.id } : {}) };
    const result = editing
      ? await supabase.from('contracts').update(payload).eq('id', editing.id)
      : await supabase.from('contracts').insert(payload);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setDialogOpen(false);
    await loadContracts();
  });

  const activeCount = contracts.filter((item) => item.status === 'ativo').length;
  return (
    <ProtectedRoute allowedRoles={['administrador', 'administracao']}>
      <MainLayout title="Gestão de Contratos" subtitle="Administração de contratos e fornecedores">
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-gray-900">Contratos</h1><p className="mt-1 text-gray-600">{activeCount} contrato{activeCount === 1 ? '' : 's'} ativo{activeCount === 1 ? '' : 's'}</p></div><Button onClick={openCreate}><Plus size={20} />Novo contrato</Button></div>
          <div className="relative max-w-xl"><Search className="absolute left-3 top-2.5 text-gray-400" size={20} /><Input aria-label="Buscar contratos" placeholder="Buscar por número, fornecedor ou objeto" className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          {error && <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><Button size="sm" variant="outline" onClick={() => void loadContracts()}><RefreshCw size={15} />Tentar novamente</Button></div>}
          {loading ? <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div> : !filtered.length ? <Card><EmptyState icon={<FileText size={42} />} title="Nenhum contrato encontrado" description="Cadastre o primeiro contrato ou ajuste a busca." action={<Button onClick={openCreate}><Plus size={18} />Novo contrato</Button>} /></Card> : <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{filtered.map((contract) => <Card key={contract.id}><CardContent className="space-y-3 p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-gray-900">{contract.supplier}</p><p className="text-sm text-gray-600">{contract.subject}</p></div><Badge variant={STATUS_VARIANTS[contract.status] ?? 'secondary'}>{contract.status}</Badge></div><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="block text-xs text-gray-500">Número</span>{contract.contract_number}</div><div><span className="block text-xs text-gray-500">Vigência</span>{new Date(`${contract.start_date}T12:00:00`).toLocaleDateString('pt-BR')} a {new Date(`${contract.end_date}T12:00:00`).toLocaleDateString('pt-BR')}</div>{contract.value != null && <div><span className="block text-xs text-gray-500">Valor</span>{contract.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>}</div><div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => openEdit(contract)}><Edit2 size={15} />Editar</Button></div></CardContent></Card>)}</div>}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Editar contrato' : 'Novo contrato'}</DialogTitle></DialogHeader><form onSubmit={saveContract} className="space-y-4"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Número do contrato" error={form.formState.errors.contract_number?.message} {...form.register('contract_number')} /><Input label="Fornecedor" error={form.formState.errors.supplier?.message} {...form.register('supplier')} /></div><Input label="Objeto" error={form.formState.errors.subject?.message} {...form.register('subject')} /><div><label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label><textarea className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2" {...form.register('description')} /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input type="date" label="Início da vigência" error={form.formState.errors.start_date?.message} {...form.register('start_date')} /><Input type="date" label="Fim da vigência" error={form.formState.errors.end_date?.message} {...form.register('end_date')} /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Valor (R$)" inputMode="decimal" error={form.formState.errors.value?.message} {...form.register('value')} /><div><label className="mb-1 block text-sm font-medium text-gray-700">Status</label><select className="w-full rounded-lg border border-gray-300 px-3 py-2" {...form.register('status')}><option value="rascunho">Rascunho</option><option value="ativo">Ativo</option><option value="vencendo">Vencendo</option><option value="vencido">Vencido</option><option value="encerrado">Encerrado</option><option value="cancelado">Cancelado</option></select></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" loading={saving}>{editing ? 'Salvar alterações' : 'Cadastrar contrato'}</Button></DialogFooter></form></DialogContent></Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
