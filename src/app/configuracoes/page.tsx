'use client';

import React from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function ConfiguracosPage() {
  return (
    <MainLayout title="Configurações" subtitle="Administração do sistema">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-1">Administração de usuários, perfis e permissões</p>
        </div>

        <div className="space-y-4">
          {/* Users */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Usuários</CardTitle>
              <Button variant="primary" size="sm" className="flex items-center gap-2">
                <Plus size={16} />
                Novo Usuário
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['admin@hub.es', 'gestao@hub.es', 'recepcao@hub.es', 'manutencao@hub.es'].map((user, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border border-gray-200 rounded">
                    <span className="font-medium text-sm">{user}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader>
              <CardTitle>Perfis de Acesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Administrador', users: 1, perms: 'Acesso total' },
                  { name: 'Administração', users: 2, perms: 'Compras, Eventos' },
                  { name: 'Recepção', users: 1, perms: 'Eventos, Presença' },
                  { name: 'Manutenção', users: 2, perms: 'Ocorrências' },
                ].map((role, i) => (
                  <div key={i} className="p-3 border border-gray-200 rounded">
                    <p className="font-semibold text-sm">{role.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{role.users} usuários</p>
                    <p className="text-xs text-gray-600">{role.perms}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Departments */}
          <Card>
            <CardHeader>
              <CardTitle>Setores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['Direção', 'Administração', 'Tecnologia', 'Limpeza', 'Eventos'].map((dept, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border border-gray-200 rounded">
                    <span className="font-medium text-sm">{dept}</span>
                    <Badge>Ativo</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
