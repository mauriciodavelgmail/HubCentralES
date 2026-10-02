'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, LoadingSpinner, EmptyState, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { getPurchases, createPurchase, updatePurchase, deletePurchase, Purchase, getPurchasesByStatus, getPurchasesByPriority } from '@/lib/supabase/purchases';
import { Search, Plus, Trash2, Edit, AlertCircle, CheckCircle, ShoppingCart, TrendingUp } from 'lucide-react';

const STATUSES = ['cotacao', 'solicitacao', 'aprovacao', 'compra_realizada', 'recebimento', 'concluida', 'cancelada'];
const PRIORITIES = ['baixa', 'media', 'alta', 'urgente'];

export default function ComprasPage() {
  const { user, profile } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    purchase_number: '',
    description: '',
    supplier: '',
    quantity: '',
    unit_cost: '',
    total_cost: '',
    status: 'cotacao',
    priority: 'media',
    requested_date: '',
    expected_delivery_date: '',
    notes: '',
  });

  // Load purchases
  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const data = await getPurchases();
      setPurchases(data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar compras: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (purchase?: Purchase) => {
    if (purchase) {
      setEditingId(purchase.id);
      setFormData({
        purchase_number: purchase.purchase_number || '',
        description: purchase.description || '',
        supplier: purchase.supplier || '',
        quantity: purchase.quantity?.toString() || '',
        unit_cost: purchase.unit_cost?.toString() || '',
        total_cost: purchase.total_cost?.toString() || '',
        status: purchase.status,
        priority: purchase.priority,
        requested_date: purchase.requested_date || '',
        expected_delivery_date: purchase.expected_delivery_date || '',
        notes: purchase.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        purchase_number: '',
        description: '',
        supplier: '',
        quantity: '',
        unit_cost: '',
        total_cost: '',
        status: 'cotacao',
        priority: 'media',
        requested_date: '',
        expected_delivery_date: '',
        notes: '',
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        status: formData.status as Purchase['status'],
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
        total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
      };

      if (editingId) {
        await updatePurchase(editingId, submitData);
      } else {
        await createPurchase(submitData as any);
      }
      await loadPurchases();
      setShowDialog(false);
      setError('');
    } catch (err: any) {
      setError('Erro ao salvar compra: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta compra?')) return;
    try {
      await deletePurchase(id);
      await loadPurchases();
      setError('');
    } catch (err: any) {
      setError('Erro ao deletar compra: ' + err.message);
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.purchase_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || purchase.status === filterStatus;
    const matchesPriority = !filterPriority || purchase.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalValue = filteredPurchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'compra_realizada':
        return <CheckCircle size={16} className="text-blue-600" />;
      case 'cancelada':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <ShoppingCart size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'success';
      case 'compra_realizada':
        return 'info';
      case 'cancelada':
        return 'danger';
      case 'aprovacao':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return 'danger';
      case 'alta':
        return 'warning';
      case 'media':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout
        userName={profile?.full_name || 'Usuário'}
        userRole={profile?.role || 'visitante'}
        title="Compras"
        subtitle="Gerencie todas as compras e aquisições"
      >
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Total de Compras</p>
                <p className="text-2xl font-bold text-gray-900">{purchases.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                <p className="text-2xl font-bold text-blue-600">R$ {totalValue.toFixed(2).replace('.', ',')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Em Progresso</p>
                <p className="text-2xl font-bold text-yellow-600">{purchases.filter(p => p.status !== 'concluida' && p.status !== 'cancelada').length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{purchases.filter(p => p.status === 'concluida').length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 flex-1">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por descrição, número ou fornecedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas Prioridades</option>
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Nova Compra
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Purchases Table */}
          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredPurchases.length === 0 ? (
            <EmptyState
              title="Nenhuma compra encontrada"
              description="Comece criando sua primeira compra"
              action={<Button onClick={() => handleOpenDialog()} className="bg-blue-600 text-white">Criar Compra</Button>}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{filteredPurchases.length} Compra(s)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Descrição</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Número</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Fornecedor</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Valor</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Prioridade</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map(purchase => (
                        <tr key={purchase.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{purchase.description}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{purchase.purchase_number}</code>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {purchase.supplier || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600">
                            R$ {(purchase.total_cost || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(purchase.status)}
                              <Badge variant={getStatusColor(purchase.status) as any}>{purchase.status}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={getPriorityColor(purchase.priority) as any}>{purchase.priority}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(purchase)}
                                className="text-gray-600 hover:bg-gray-100"
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(purchase.id)}
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
                <DialogTitle>{editingId ? 'Editar Compra' : 'Nova Compra'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Atualize os dados da compra' : 'Preencha os dados da nova compra'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Purchase Number & Supplier */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número da Compra</label>
                    <input
                      type="text"
                      value={formData.purchase_number}
                      onChange={(e) => setFormData({ ...formData, purchase_number: e.target.value })}
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

                {/* Quantity, Unit Cost, Total Cost */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_cost}
                      onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Solicitado</label>
                    <input
                      type="date"
                      value={formData.requested_date}
                      onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Entrega Esperada</label>
                    <input
                      type="date"
                      value={formData.expected_delivery_date}
                      onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                    {editingId ? 'Atualizar' : 'Criar'} Compra
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
