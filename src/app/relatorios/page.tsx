'use client';

import React from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { Download, BarChart3 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProtectedRoute } from '@/lib/auth/protected-route';

export default function RelatoriosPage() {
  const data = [
    { name: 'Jan', ocorrências: 14, eventos: 3, compras: 5 },
    { name: 'Fev', ocorrências: 18, eventos: 5, compras: 7 },
    { name: 'Mar', ocorrências: 12, eventos: 4, compras: 6 },
  ];

  return (
    <ProtectedRoute allowedRoles={['administrador', 'administracao']}>
      <MainLayout title="Relatórios e Indicadores" subtitle="Análise de dados e KPIs">
      <div className="space-y-6">
        <div className="flex gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-gray-600 mt-1">Dados dos últimos 3 meses</p>
          </div>
          <Button variant="primary" className="flex items-center gap-2">
            <Download size={20} />
            Exportar CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Tempo médio resolução', value: '4.2 dias', color: 'blue' },
            { label: 'Taxa conclusão', value: '85%', color: 'green' },
            { label: 'Eventos agendados', value: '12', color: 'purple' },
            { label: 'Documentos vencendo', value: '5', color: 'orange' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Atividade por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="ocorrências" fill="#0057B8" />
                <Bar dataKey="eventos" fill="#FF6B1A" />
                <Bar dataKey="compras" fill="#35BCEB" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
