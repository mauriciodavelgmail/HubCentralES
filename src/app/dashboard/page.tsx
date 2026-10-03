'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, BarChart3, Calendar, Clock, FileText, Package, RefreshCw, ShoppingCart, TrendingUp } from 'lucide-react';
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MainLayout } from '@/components/layout';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, LoadingSpinner } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/auth';

interface DashboardMetrics {
  openOccurrences: number;
  criticalOccurrences: number;
  averageResolutionTime: number;
  upcomingEvents: number;
  expiringDocuments: number;
  purchasesInProgress: number;
  lowStockItems: number;
}

interface OccurrenceRecord {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  resolved_at: string | null;
}

interface RecentActivity {
  id: string;
  type: 'occurrence' | 'event' | 'purchase' | 'document';
  title: string;
  status: string;
  priority?: string;
  createdAt: string;
  href: string;
}

const CATEGORY_COLORS = ['#FF6B1A', '#0057B8', '#35BCEB', '#00A86B', '#E83E8C', '#FFD23F', '#6B7280'];

function startOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days === 1 ? '' : 's'}`;
}

function badgeVariant(activity: RecentActivity): 'danger' | 'success' | 'warning' | 'info' | 'secondary' {
  if (activity.priority === 'critica' || activity.status === 'vencido' || activity.status === 'cancelada') return 'danger';
  if (['resolvida', 'realizada', 'confirmada', 'concluida', 'ativo'].includes(activity.status)) return 'success';
  if (['aguardando_aprovacao', 'solicitacao', 'aprovacao', 'vencendo'].includes(activity.status)) return 'warning';
  if (['aberta', 'em_analise', 'em_execucao', 'cotacao'].includes(activity.status)) return 'info';
  return 'secondary';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceRecord[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user || profile?.role === 'visitante') return;
    setLoading(true);
    setError(null);
    const today = startOfLocalDay(new Date());
    const inThirtyDays = new Date(today);
    inThirtyDays.setDate(inThirtyDays.getDate() + 30);
    const todayIso = today.toISOString().slice(0, 10);
    const limitIso = inThirtyDays.toISOString().slice(0, 10);

    try {
      const [occurrenceResult, eventResult, documentResult, purchaseResult, supplyResult] = await Promise.all([
        supabase.from('occurrences').select('id,title,status,priority,category,created_at,resolved_at').order('created_at', { ascending: false }),
        supabase.from('events').select('id,title,status,start_date,created_at').gte('start_date', todayIso).order('start_date', { ascending: true }),
        supabase.from('documents').select('id,title,status,validity_date,created_at').order('created_at', { ascending: false }),
        supabase.from('purchases').select('id,purchase_number,status,created_at').order('created_at', { ascending: false }),
        supabase.from('supplies').select('id,current_quantity,minimum_quantity,status'),
      ]);
      const firstError = [occurrenceResult.error, eventResult.error, documentResult.error, purchaseResult.error, supplyResult.error].find(Boolean);
      if (firstError) throw firstError;

      const occurrenceRows = (occurrenceResult.data ?? []) as OccurrenceRecord[];
      const eventRows = eventResult.data ?? [];
      const documentRows = documentResult.data ?? [];
      const purchaseRows = purchaseResult.data ?? [];
      const supplyRows = supplyResult.data ?? [];
      const resolutionDays = occurrenceRows.filter((item) => item.resolved_at).map((item) =>
        Math.max(0, (new Date(item.resolved_at as string).getTime() - new Date(item.created_at).getTime()) / 86400000)
      );

      setOccurrences(occurrenceRows);
      setMetrics({
        openOccurrences: occurrenceRows.filter((item) => !['resolvida', 'cancelada'].includes(item.status)).length,
        criticalOccurrences: occurrenceRows.filter((item) => item.priority === 'critica' && !['resolvida', 'cancelada'].includes(item.status)).length,
        averageResolutionTime: resolutionDays.length ? Number((resolutionDays.reduce((sum, value) => sum + value, 0) / resolutionDays.length).toFixed(1)) : 0,
        upcomingEvents: eventRows.filter((item) => ['confirmada', 'aguardando_aprovacao'].includes(item.status)).length,
        expiringDocuments: documentRows.filter((item) => item.status === 'vencido' || item.status === 'vencendo' || (!!item.validity_date && item.validity_date <= limitIso)).length,
        purchasesInProgress: purchaseRows.filter((item) => !['concluida', 'cancelada'].includes(item.status)).length,
        lowStockItems: supplyRows.filter((item) => item.status === 'baixo_estoque' || Number(item.current_quantity) <= Number(item.minimum_quantity)).length,
      });

      const recent: RecentActivity[] = [
        ...occurrenceRows.slice(0, 6).map((item) => ({ id: `occurrence-${item.id}`, type: 'occurrence' as const, title: item.title, status: item.status, priority: item.priority, createdAt: item.created_at, href: '/ocorrencias' })),
        ...eventRows.slice(0, 4).map((item) => ({ id: `event-${item.id}`, type: 'event' as const, title: item.title, status: item.status, createdAt: item.created_at, href: '/agenda' })),
        ...purchaseRows.slice(0, 4).map((item) => ({ id: `purchase-${item.id}`, type: 'purchase' as const, title: item.purchase_number, status: item.status, createdAt: item.created_at, href: '/compras' })),
        ...documentRows.slice(0, 4).map((item) => ({ id: `document-${item.id}`, type: 'document' as const, title: item.title, status: item.status, createdAt: item.created_at, href: '/documentos' })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
      setActivities(recent);
    } catch (loadError) {
      console.error('Erro ao carregar dashboard:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os indicadores.');
    } finally {
      setLoading(false);
    }
  }, [profile?.role, user]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const occurrenceChart = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = startOfLocalDay(new Date());
    date.setDate(date.getDate() - (6 - index));
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const rows = occurrences.filter((item) => { const createdAt = new Date(item.created_at); return createdAt >= date && createdAt < nextDate; });
    return {
      name: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
      abertas: rows.filter((item) => item.status === 'aberta').length,
      emAndamento: rows.filter((item) => ['em_analise', 'em_execucao'].includes(item.status)).length,
      resolvidas: rows.filter((item) => item.status === 'resolvida').length,
    };
  }), [occurrences]);

  const categoryChart = useMemo(() => {
    const totals = occurrences.reduce<Record<string, number>>((result, item) => { result[item.category] = (result[item.category] ?? 0) + 1; return result; }, {});
    return Object.entries(totals).map(([name, value], index) => ({ name, value, color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }));
  }, [occurrences]);

  return (
    <ProtectedRoute allowedRoles={['administrador', 'administracao', 'recepcao', 'manutencao', 'limpeza']}>
      <MainLayout userName={profile?.full_name || user?.email?.split('@')[0] || 'Usuário'} userRole={profile?.role || 'visitante'} title="Dashboard" subtitle="Visão geral da operação do HUB ES+">
        {loading ? <div className="flex min-h-[50vh] items-center justify-center"><LoadingSpinner size="lg" /></div> : error || !metrics ? (
          <EmptyState icon={<AlertCircle size={42} />} title="Não foi possível carregar o dashboard" description={error || 'Tente novamente em alguns instantes.'} action={<Button onClick={() => void loadDashboard()}><RefreshCw size={16} /> Tentar novamente</Button>} />
        ) : <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Ocorrências abertas', value: metrics.openOccurrences, icon: AlertCircle, tone: 'bg-blue-50' },
              { label: 'Ocorrências críticas', value: metrics.criticalOccurrences, icon: TrendingUp, tone: 'bg-red-50' },
              { label: 'Tempo médio (dias)', value: metrics.averageResolutionTime, icon: Clock, tone: 'bg-green-50' },
              { label: 'Próximos eventos', value: metrics.upcomingEvents, icon: Calendar, tone: 'bg-purple-50' },
              { label: 'Estoque em alerta', value: metrics.lowStockItems, icon: Package, tone: 'bg-orange-50' },
            ].map(({ label, value, icon: Icon, tone }) => <Card key={label} className={tone}><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm text-gray-600">{label}</p><p className="text-3xl font-bold text-gray-900">{value}</p></div><Icon size={38} className="text-gray-400" /></CardContent></Card>)}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Ocorrências por dia</CardTitle><CardDescription>Registros dos últimos sete dias</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={occurrenceChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="abertas" name="Abertas" stroke="#FFD23F" strokeWidth={2} /><Line type="monotone" dataKey="emAndamento" name="Em andamento" stroke="#35BCEB" strokeWidth={2} /><Line type="monotone" dataKey="resolvidas" name="Resolvidas" stroke="#00A86B" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle>Por categoria</CardTitle><CardDescription>Distribuição das ocorrências</CardDescription></CardHeader><CardContent>{categoryChart.length ? <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={categoryChart} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name">{categoryChart.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="py-24 text-center text-sm text-gray-500">Nenhuma ocorrência cadastrada.</p>}</CardContent></Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle size={20} className="text-red-600" />Atenção necessária</CardTitle></CardHeader><CardContent className="space-y-3">
              <button onClick={() => router.push('/ocorrencias')} className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left"><strong className="block text-sm text-red-900">{metrics.criticalOccurrences} ocorrências críticas</strong><span className="text-xs text-red-700">Requerem ação imediata</span></button>
              <button onClick={() => router.push('/documentos')} className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-left"><strong className="block text-sm text-yellow-900">{metrics.expiringDocuments} documentos vencidos ou vencendo</strong><span className="text-xs text-yellow-700">Validade em até 30 dias</span></button>
              <button onClick={() => router.push('/insumos')} className="w-full rounded-lg border border-orange-200 bg-orange-50 p-3 text-left"><strong className="block text-sm text-orange-900">{metrics.lowStockItems} itens em alerta</strong><span className="text-xs text-orange-700">Quantidade no estoque mínimo</span></button>
              <button onClick={() => router.push('/compras')} className="w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-left"><strong className="block text-sm text-blue-900">{metrics.purchasesInProgress} compras em andamento</strong><span className="text-xs text-blue-700">Acompanhe as etapas pendentes</span></button>
            </CardContent></Card>
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Atividades recentes</CardTitle></CardHeader><CardContent>{activities.length ? <div className="space-y-3">{activities.map((activity) => {
              const Icon = activity.type === 'occurrence' ? AlertCircle : activity.type === 'event' ? Calendar : activity.type === 'purchase' ? ShoppingCart : FileText;
              return <button key={activity.id} onClick={() => router.push(activity.href)} className="flex w-full items-start gap-3 border-b border-gray-100 pb-3 text-left last:border-0"><Icon size={20} className="mt-1 shrink-0 text-blue-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-900">{activity.title}</p><div className="mt-1 flex items-center gap-2"><Badge variant={badgeVariant(activity)}>{activity.status.replaceAll('_', ' ')}</Badge><span className="text-xs text-gray-500">{relativeTime(activity.createdAt)}</span></div></div></button>;
            })}</div> : <p className="py-12 text-center text-sm text-gray-500">Nenhuma atividade registrada.</p>}</CardContent></Card>
          </div>

          <Card><CardHeader><CardTitle>Ações rápidas</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><Button variant="outline" className="h-20 flex-col" onClick={() => router.push('/ocorrencias')}><AlertCircle size={24} />Nova ocorrência</Button><Button variant="outline" className="h-20 flex-col" onClick={() => router.push('/agenda')}><Calendar size={24} />Agendar evento</Button><Button variant="outline" className="h-20 flex-col" onClick={() => router.push('/documentos')}><FileText size={24} />Upload de documento</Button><Button variant="outline" className="h-20 flex-col" onClick={() => router.push('/relatorios')}><BarChart3 size={24} />Ver relatórios</Button></div></CardContent></Card>
        </div>}
      </MainLayout>
    </ProtectedRoute>
  );
}
