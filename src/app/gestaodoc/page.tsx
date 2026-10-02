'use client';

import React from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { FileText, Plus, Eye } from 'lucide-react';

export default function GestaoDependPage() {
  return (
    <MainLayout title="Gestão Documental" subtitle="Administração de documentos do sistema">
      <div className="space-y-6">
        <div className="flex gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão Documental</h1>
            <p className="text-gray-600 mt-1">256 documentos registrados</p>
          </div>
          <Button variant="primary" className="flex items-center gap-2">
            <Plus size={20} />
            Novo Documento
          </Button>
        </div>

        <div className="space-y-3">
          {[
            { id: 'DOC-001', title: 'POP - Procedimento Limpeza', status: 'ativo', date: '2025-10-02' },
            { id: 'DOC-002', title: 'Contrato Fornecedor', status: 'ativo', date: '2024-12-31' },
            { id: 'DOC-003', title: 'Norma Segurança', status: 'vencendo', date: '2025-10-20' },
            { id: 'DOC-004', title: 'Ata Reunião Direção', status: 'ativo', date: '2025-10-01' },
          ].map((doc, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <FileText className="text-gray-400 flex-shrink-0" size={24} />
                    <div>
                      <p className="font-semibold">{doc.title}</p>
                      <p className="text-xs text-gray-600">{doc.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={doc.status === 'vencendo' ? 'warning' : 'success'}>
                      {doc.status}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Eye size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
