'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, LoadingSpinner, EmptyState } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Calendar,
  Package,
  Wrench,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DashboardMetrics {
  totalOccurrences: number;
  openOccurrences: number;
  criticalOccurrences: number;
  averageResolutionTime: number;
  totalEvents: number;
  upcomingEvents: number;
  totalDocuments: number;
  expiredDocuments: number;
  purchasesInProgress: number;
  lowStockItems: number;
}

const MOCK_METRICS: DashboardMetrics = {
  totalOccurrences: 47,
  openOccurrences: 8,
  criticalOccurrences: 2,
  averageResolutionTime: 4.2,
  totalEvents: 12,
  upcomingEvents: 3,
  totalDocuments: 256,
  expiredDocuments: 5,
  purchasesInProgress: 6,
  lowStockItems: 3,
};

const OCCURRENCE_CHART_DATA = [
  { name: 'Seg', aberta: 2, em_execucao: 1, resolvida: 3 },
  { name: 'Ter', aberta: 3, em_execucao: 2, resolvida: 2 },
  { name: 'Qua', aberta: 1, em_execucao: 3, resolvida: 4 },
  { name: 'Qui', aberta: 3, em_execucao: 2, resolvida: 3 },
  { name: 'Sex', aberta: 2, em_execucao: 1, resolvida: 5 },
];

const CATEGORY_DATA = [
  { name: 'Infraestrutura', value: 15, color: '#FF6B1A' },
  { name: 'Tecnologia', value: 12, color: '#0057B8' },
  { name: 'Manutenção', value: 11, color: '#35BCEB' },
  { name: 'Limpeza', value: 6, color: '#00A86B' },
  { name: 'Outros', value: 3, color: '#6B7280' },
];

const RECENT_ACTIVITIES = [
  {
    id: 1,
    type: 'occurrence',
    title: 'Ar condicionado auditório',
    status: 'em_execucao',
    priority: 'alta',
    time: '2 horas atrás',
  },
  {
    id: 2,
    type: 'event',
    title: 'Workshop de Prototipagem',
    status: 'confirmada',
    time: '4 horas atrás',
  },
  {
    id: 3,
    type: 'purchase',
    title: 'Requisição de panos de limpeza',
    status: 'aprovacao',
    time: '1 dia atrás',
  },
  {
    id: 4,
    type: 'document',
    title: 'POP - Procedimento de limpeza',
    status: 'ativo',
    time: '3 dias atrás',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (profile?.role === 'visitante') {
      router.replace('/agenda');
      return;
    }

    // Load metrics from database
    setMetrics(MOCK_METRICS);
    setLoading(false);
  }, [user, profile, authLoading, router]);

  if (loading || !metrics || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}
        userRole={profile?.role || 'visitante'}
        title="Dashboard"
        subtitle="Visão geral da operação do HUB ES+"
      >
        <div className="space-y-6">
          {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ocorrências Abertas</p>
                  <p className="text-3xl font-bold text-blue-600">{metrics.openOccurrences}</p>
                </div>
                <AlertCircle size={40} className="text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Críticas</p>
                  <p className="text-3xl font-bold text-red-600">{metrics.criticalOccurrences}</p>
                </div>
                <TrendingUp size={40} className="text-red-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tempo Médio (dias)</p>
                  <p className="text-3xl font-bold text-green-600">{metrics.averageResolutionTime}</p>
                </div>
                <Clock size={40} className="text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Eventos Próximos</p>
                  <p className="text-3xl font-bold text-purple-600">{metrics.upcomingEvents}</p>
                </div>
                <Calendar size={40} className="text-purple-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Itens em Alerta</p>
                  <p className="text-3xl font-bold text-orange-600">{metrics.lowStockItems}</p>
                </div>
                <Package size={40} className="text-orange-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Occurrences by time */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Ocorrências por Dia</CardTitle>
              <CardDescription>Últimos 5 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={OCCURRENCE_CHART_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="aberta" stroke="#FFD23F" strokeWidth={2} />
                  <Line type="monotone" dataKey="em_execucao" stroke="#35BCEB" strokeWidth={2} />
                  <Line type="monotone" dataKey="resolvida" stroke="#00A86B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category pie chart */}
          <Card>
            <CardHeader>
              <CardTitle>Por Categoria</CardTitle>
              <CardDescription>Distribuição</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={CATEGORY_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {CATEGORY_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Alerts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle size={20} className="text-red-600" />
                Atenção Necessária
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-900 text-sm">2 Ocorrências Críticas</p>
                <p className="text-xs text-red-700">Requerem ação imediata</p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium text-yellow-900 text-sm">5 Documentos Vencendo</p>
                <p className="text-xs text-yellow-700">Em até 30 dias</p>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="font-medium text-orange-900 text-sm">3 Itens em Alerta</p>
                <p className="text-xs text-orange-700">Estoque baixo</p>
              </div>
              <Button
                variant="danger"
                className="w-full mt-4"
                onClick={() => router.push('/ocorrencias')}
              >
                Ver Todos os Alertas
              </Button>
            </CardContent>
          </Card>

          {/* Recent activities */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {RECENT_ACTIVITIES.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className="mt-1">
                      {activity.type === 'occurrence' && <AlertCircle size={20} className="text-blue-600" />}
                      {activity.type === 'event' && <Calendar size={20} className="text-purple-600" />}
                      {activity.type === 'purchase' && <ShoppingCart size={20} className="text-orange-600" />}
                      {activity.type === 'document' && <FileText size={20} className="text-gray-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            activity.priority === 'alta' ? 'danger' :
                            activity.status === 'confirmada' ? 'success' :
                            activity.status === 'aprovacao' ? 'warning' : 'info'
                          }
                        >
                          {activity.status}
                        </Badge>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => router.push('/ocorrencias')}
              >
                <AlertCircle size={24} className="mb-1" />
                <span className="text-sm">Nova Ocorrência</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => router.push('/agenda')}
              >
                <Calendar size={24} className="mb-1" />
                <span className="text-sm">Agendar Evento</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => router.push('/documentos')}
              >
                <FileText size={24} className="mb-1" />
                <span className="text-sm">Upload Documento</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => router.push('/relatorios')}
              >
                <BarChart3 size={24} className="mb-1" />
                <span className="text-sm">Ver Relatórios</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

import { ShoppingCart, BarChart3 } from 'lucide-react';
