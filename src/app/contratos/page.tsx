'use client';

import React from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { Plus } from 'lucide-react';
import { ProtectedRoute } from '@/lib/auth/protected-route';

export default function ContratosPage() {
  return (
    <ProtectedRoute allowedRoles={['administrador', 'administracao']}>
    <MainLayout title="Gestão de Contratos" subtitle="Administração de contratos e fornecedores">
      <div className="space-y-6">
        <div className="flex gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
            <p className="text-gray-600 mt-1">8 contratos vigentes</p>
          </div>
          <Button variant="primary" className="flex items-center gap-2">
            <Plus size={20} />
            Novo Contrato
          </Button>
        </div>

        <div className="space-y-3">
          {[
            { id: 'CT-2024-001', supplier: 'Fornecedor A', subject: 'Prestação de serviços de limpeza', status: 'ativo', endDate: '2025-12-31' },
            { id: 'CT-2024-002', supplier: 'Fornecedor B', subject: 'Fornecimento de materiais', status: 'ativo', endDate: '2026-06-30' },
            { id: 'CT-2024-003', supplier: 'Fornecedor C', subject: 'Manutenção preventiva', status: 'ativo', endDate: '2025-09-30' },
          ].map((contract, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{contract.supplier}</p>
                    <p className="text-sm text-gray-600">{contract.subject}</p>
                  </div>
                  <Badge variant={contract.status === 'ativo' ? 'success' : 'warning'}>
                    {contract.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{contract.id}</span>
                  <span>Vence: {contract.endDate}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
    </ProtectedRoute>
  );
}
