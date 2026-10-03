'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MainLayout } from '@/components/layout';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, LoadingSpinner } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { supabase } from '@/lib/supabase/auth';

interface DatedRecord { created_at: string; }
interface OccurrenceRecord extends DatedRecord { category: string; priority: string; status: string; resolved_at: string | null; responsible_id: string | null; }
interface EventRecord extends DatedRecord { space_id: string; status: string; }
interface PurchaseRecord extends DatedRecord { status: string; }
interface DocumentRecord { status: string; validity_date: string | null; }
interface SupplyRecord { current_quantity: number; minimum_quantity: number; }

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function RelatoriosPage() {
  const [occurrences, setOccurrences] = useState<OccurrenceRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [supplies, setSupplies] = useState<SupplyRecord[]>([]);
  const [spaces, setSpaces] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all([
        supabase.from('occurrences').select('category,priority,status,resolved_at,responsible_id,created_at'),
        supabase.from('events').select('space_id,status,created_at'),
        supabase.from('purchases').select('status,created_at'),
        supabase.from('documents').select('status,validity_date'),
        supabase.from('supplies').select('current_quantity,minimum_quantity'),
        supabase.from('spaces').select('id,name'),
      ]);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
      setOccurrences((results[0].data ?? []) as OccurrenceRecord[]);
      setEvents((results[1].data ?? []) as EventRecord[]);
      setPurchases((results[2].data ?? []) as PurchaseRecord[]);
      setDocuments((results[3].data ?? []) as DocumentRecord[]);
      setSupplies((results[4].data ?? []) as SupplyRecord[]);
      setSpaces((results[5].data ?? []) as Array<{ id: string; name: string }>);
    } catch (loadError) {
      console.error('Erro ao carregar relatórios:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar relatórios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const averageResolutionDays = useMemo(() => {
    const durations = occurrences.filter((item) => item.resolved_at).map((item) => (new Date(item.resolved_at as string).getTime() - new Date(item.created_at).getTime()) / 86400000);
    return durations.length ? (durations.reduce((total, current) => total + current, 0) / durations.length).toFixed(1) : '0';
  }, [occurrences]);

  const activityByMonth = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const inMonth = (value: string) => { const parsed = new Date(value); return parsed >= date && parsed < next; };
    return {
      name: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', ''),
      ocorrências: occurrences.filter((item) => inMonth(item.created_at)).length,
      eventos: events.filter((item) => inMonth(item.created_at)).length,
      compras: purchases.filter((item) => inMonth(item.created_at)).length,
    };
  }), [events, occurrences, purchases]);

  const group = (rows: Array<Record<string, unknown>>, field: string) => Object.entries(rows.reduce<Record<string, number>>((result, row) => {
    const key = String(row[field] || 'não informado');
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {})).sort((a, b) => b[1] - a[1]);

  const categoryData = useMemo(() => group(occurrences as unknown as Array<Record<string, unknown>>, 'category').map(([name, total]) => ({ name, total })), [occurrences]);
  const priorityData = useMemo(() => group(occurrences as unknown as Array<Record<string, unknown>>, 'priority').map(([name, total]) => ({ name, total })), [occurrences]);
  const purchaseData = useMemo(() => group(purchases as unknown as Array<Record<string, unknown>>, 'status').map(([name, total]) => ({ name, total })), [purchases]);
  const spaceData = useMemo(() => {
    const names = new Map(spaces.map((space) => [space.id, space.name]));
    const counts = events.reduce<Record<string, number>>((result, event) => { const name = names.get(event.space_id) ?? 'Não informado'; result[name] = (result[name] ?? 0) + 1; return result; }, {});
    return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [events, spaces]);

  const today = new Date().toISOString().slice(0, 10);
  const inThirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const expiringDocuments = documents.filter((item) => item.status === 'vencido' || item.status === 'vencendo' || (!!item.validity_date && item.validity_date >= today && item.validity_date <= inThirtyDays)).length;
  const criticalStock = supplies.filter((item) => Number(item.current_quantity) <= Number(item.minimum_quantity)).length;
  const resolvedRate = occurrences.length ? Math.round(occurrences.filter((item) => item.status === 'resolvida').length / occurrences.length * 100) : 0;

  const exportCsv = () => {
    const rows = [
      ['Indicador', 'Valor'],
      ['Tempo médio de resolução (dias)', averageResolutionDays],
      ['Taxa de resolução (%)', resolvedRate],
      ['Eventos cadastrados', events.length],
      ['Documentos vencidos/vencendo', expiringDocuments],
      ['Itens em estoque crítico', criticalStock],
      ...categoryData.map((item) => [`Ocorrências - ${item.name}`, item.total]),
      ...priorityData.map((item) => [`Prioridade - ${item.name}`, item.total]),
      ...purchaseData.map((item) => [`Compras - ${item.name}`, item.total]),
      ...spaceData.map((item) => [`Eventos no espaço - ${item.name}`, item.total]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hubcentral-relatorio-${today}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const charts = [
    { title: 'Ocorrências por categoria', data: categoryData, color: '#0057B8' },
    { title: 'Ocorrências por prioridade', data: priorityData, color: '#EF4E36' },
    { title: 'Compras por status', data: purchaseData, color: '#FF6B1A' },
    { title: 'Eventos por espaço', data: spaceData, color: '#00A86B' },
  ];

  return (
    <ProtectedRoute allowedRoles={['administrador', 'administracao']}>
      <MainLayout title="Relatórios e Indicadores" subtitle="Análise de dados e KPIs">
        {loading ? <div className="flex min-h-[50vh] items-center justify-center"><LoadingSpinner size="lg" /></div> : error ? <EmptyState title="Não foi possível carregar os relatórios" description={error} action={<Button onClick={() => void loadReports()}><RefreshCw size={16} />Tentar novamente</Button>} /> : <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-gray-900">Relatórios</h1><p className="mt-1 text-gray-600">Indicadores calculados com os dados atuais do sistema</p></div><Button onClick={exportCsv}><Download size={20} />Exportar CSV</Button></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Tempo médio de resolução', `${averageResolutionDays} dias`],
              ['Taxa de resolução', `${resolvedRate}%`],
              ['Eventos cadastrados', events.length],
              ['Documentos vencendo', expiringDocuments],
              ['Estoque crítico', criticalStock],
            ].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4 text-center"><p className="text-sm text-gray-600">{label}</p><p className="mt-2 text-3xl font-bold text-blue-600">{value}</p></CardContent></Card>)}
          </div>
          <Card><CardHeader><CardTitle>Atividade por mês</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={activityByMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="ocorrências" fill="#0057B8" /><Bar dataKey="eventos" fill="#FF6B1A" /><Bar dataKey="compras" fill="#35BCEB" /></BarChart></ResponsiveContainer></CardContent></Card>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">{charts.map((chart) => <Card key={chart.title}><CardHeader><CardTitle>{chart.title}</CardTitle></CardHeader><CardContent>{chart.data.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={chart.data} layout="vertical" margin={{ left: 25 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="total" fill={chart.color} /></BarChart></ResponsiveContainer> : <p className="py-20 text-center text-sm text-gray-500">Sem dados para este indicador.</p>}</CardContent></Card>)}</div>
        </div>}
      </MainLayout>
    </ProtectedRoute>
  );
}
