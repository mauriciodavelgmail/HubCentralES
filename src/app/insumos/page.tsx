'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, LoadingSpinner, EmptyState, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { getSupplies, createSupply, updateSupply, deleteSupply, Supply, getSuppliesByCritical, getSuppliesByCategory } from '@/lib/supabase/supplies';
import { Search, Plus, Trash2, Edit, AlertCircle, CheckCircle, AlertTriangle, Package } from 'lucide-react';

const CATEGORIES = ['limpeza', 'manutencao', 'administrativo', 'tecnologia', 'seguranca', 'higiene', 'outro'];
const STATUSES = ['normal', 'baixo', 'critico'];

export default function InsumosPage() {
  const { user, profile } = useAuth();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'limpeza',
    code: '',
    supplier: '',
    quantity: '',
    minimum_quantity: '',
    unit: 'unidade',
    status: 'normal',
    unit_cost: '',
    last_purchase_date: '',
  });

  // Load supplies
  useEffect(() => {
    loadSupplies();
  }, []);

  const loadSupplies = async () => {
    try {
      setLoading(true);
      const data = await getSupplies();
      setSupplies(data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar insumos: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (supply?: Supply) => {
    if (supply) {
      setEditingId(supply.id);
      setFormData({
        name: supply.name,
        description: supply.description || '',
        category: supply.category,
        code: supply.code || '',
        supplier: supply.supplier || '',
        quantity: supply.quantity?.toString() || '',
        minimum_quantity: supply.minimum_quantity?.toString() || '',
        unit: supply.unit || 'unidade',
        status: supply.status,
        unit_cost: supply.unit_cost?.toString() || '',
        last_purchase_date: supply.last_purchase_date || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        category: 'limpeza',
        code: '',
        supplier: '',
        quantity: '',
        minimum_quantity: '',
        unit: 'unidade',
        status: 'normal',
        unit_cost: '',
        last_purchase_date: '',
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        minimum_quantity: formData.minimum_quantity ? parseInt(formData.minimum_quantity) : null,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
      };

      if (editingId) {
        await updateSupply(editingId, submitData);
      } else {
        await createSupply(submitData as any);
      }
      await loadSupplies();
      setShowDialog(false);
      setError('');
    } catch (err: any) {
      setError('Erro ao salvar insumo: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este insumo?')) return;
    try {
      await deleteSupply(id);
      await loadSupplies();
      setError('');
    } catch (err: any) {
      setError('Erro ao deletar insumo: ' + err.message);
    }
  };

  const filteredSupplies = supplies.filter(supply => {
    const matchesSearch = supply.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supply.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supply.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || supply.category === filterCategory;
    const matchesStatus = !filterStatus || supply.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const criticalItems = supplies.filter(s => s.status === 'critico');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critico':
        return <AlertTriangle size={16} className="text-red-600" />;
      case 'baixo':
        return <AlertCircle size={16} className="text-yellow-600" />;
      case 'normal':
        return <CheckCircle size={16} className="text-green-600" />;
      default:
        return <Package size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critico':
        return 'danger';
      case 'baixo':
        return 'warning';
      case 'normal':
        return 'success';
      default:
        return 'secondary';
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout
        userName={profile?.full_name || 'Usuário'}
        userRole={profile?.role || 'visitante'}
        title="Insumos e Estoque"
        subtitle="Gerencie todos os insumos e materiais"
      >
        <div className="space-y-6">
          {/* Alert */}
          {criticalItems.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-red-800">⚠️ {criticalItems.length} item(s) crítico(s)</p>
                <p className="text-sm text-red-700">Quantidade abaixo do mínimo recomendado</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 flex-1">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, código ou fornecedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas Categorias</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos Status</option>
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Novo Insumo
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Supplies Table */}
          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredSupplies.length === 0 ? (
            <EmptyState
              title="Nenhum insumo encontrado"
              description="Comece cadastrando seu primeiro insumo"
              action={<Button onClick={() => handleOpenDialog()} className="bg-blue-600 text-white">Criar Insumo</Button>}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{filteredSupplies.length} Insumo(s)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Código</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Categoria</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Quantidade</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSupplies.map(supply => (
                        <tr key={supply.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{supply.name}</p>
                              <p className="text-xs text-gray-500">{supply.supplier}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{supply.code}</code>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="info">{supply.category}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900 font-semibold">
                              {supply.quantity} <span className="text-xs text-gray-500">{supply.unit}</span>
                            </div>
                            {supply.minimum_quantity && (
                              <p className="text-xs text-gray-500">Mín: {supply.minimum_quantity}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(supply.status)}
                              <Badge variant={getStatusColor(supply.status) as any}>{supply.status}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(supply)}
                                className="text-gray-600 hover:bg-gray-100"
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(supply.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Insumo' : 'Novo Insumo'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Atualize os dados do insumo' : 'Preencha os dados do novo insumo'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Code & Supplier */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Category, Unit, Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quantity */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade Mínima</label>
                    <input
                      type="number"
                      value={formData.minimum_quantity}
                      onChange={(e) => setFormData({ ...formData, minimum_quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custo Unitário</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Last Purchase Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Última Compra</label>
                  <input
                    type="date"
                    value={formData.last_purchase_date}
                    onChange={(e) => setFormData({ ...formData, last_purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                    {editingId ? 'Atualizar' : 'Criar'} Insumo
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
                <p className="text-xs text-gray-600">
                  {item.qty} un. | Mínimo: {item.min}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
