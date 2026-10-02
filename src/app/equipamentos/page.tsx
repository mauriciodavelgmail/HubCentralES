'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, LoadingSpinner, EmptyState, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { getEquipments, createEquipment, updateEquipment, deleteEquipment, Equipment, getEquipmentsByStatus, getEquipmentsByLocation } from '@/lib/supabase/equipments';
import { Search, Plus, Trash2, Edit, AlertCircle, CheckCircle, Wrench, AlertTriangle } from 'lucide-react';

const LOCATIONS = ['auditorio', 'sala_1', 'sala_2', 'hall', 'cozinha', 'lab_maker', 'sala_ti', 'area_externos'];
const STATUSES = ['disponivel', 'em_uso', 'em_manutencao', 'desativado'];
const MAINTENANCE_STATUS = ['ok', 'atencao', 'alerta'];

export default function EquipamentosPage() {
  const { user, profile } = useAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    patrimonial_code: '',
    manufacturer: '',
    location: '',
    status: 'disponivel',
    maintenance_status: 'ok',
    purchase_date: '',
    warranty_expiration_date: '',
    last_maintenance_date: '',
    next_maintenance_date: '',
    notes: '',
  });

  // Load equipments
  useEffect(() => {
    loadEquipments();
  }, []);

  const loadEquipments = async () => {
    try {
      setLoading(true);
      const data = await getEquipments();
      setEquipments(data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar equipamentos: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (equipment?: Equipment) => {
    if (equipment) {
      setEditingId(equipment.id);
      setFormData({
        name: equipment.name,
        description: equipment.description || '',
        patrimonial_code: equipment.patrimonial_code || '',
        manufacturer: equipment.manufacturer || '',
        location: equipment.location || '',
        status: equipment.status,
        maintenance_status: equipment.maintenance_status || 'ok',
        purchase_date: equipment.purchase_date || '',
        warranty_expiration_date: equipment.warranty_expiration_date || '',
        last_maintenance_date: equipment.last_maintenance_date || '',
        next_maintenance_date: equipment.next_maintenance_date || '',
        notes: equipment.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        patrimonial_code: '',
        manufacturer: '',
        location: '',
        status: 'disponivel',
        maintenance_status: 'ok',
        purchase_date: '',
        warranty_expiration_date: '',
        last_maintenance_date: '',
        next_maintenance_date: '',
        notes: '',
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateEquipment(editingId, formData);
      } else {
        await createEquipment(formData as any);
      }
      await loadEquipments();
      setShowDialog(false);
      setError('');
    } catch (err: any) {
      setError('Erro ao salvar equipamento: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este equipamento?')) return;
    try {
      await deleteEquipment(id);
      await loadEquipments();
      setError('');
    } catch (err: any) {
      setError('Erro ao deletar equipamento: ' + err.message);
    }
  };

  const filteredEquipments = equipments.filter(eq => {
    const matchesSearch = eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.patrimonial_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !filterLocation || eq.location === filterLocation;
    const matchesStatus = !filterStatus || eq.status === filterStatus;
    return matchesSearch && matchesLocation && matchesStatus;
  });

  const maintenanceAlerts = equipments.filter(e => e.maintenance_status !== 'ok');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'disponivel':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'em_manutencao':
        return <AlertTriangle size={16} className="text-yellow-600" />;
      case 'desativado':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Wrench size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel':
        return 'success';
      case 'em_uso':
        return 'info';
      case 'em_manutencao':
        return 'warning';
      case 'desativado':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getMaintenanceColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'success';
      case 'atencao':
        return 'warning';
      case 'alerta':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout
        userName={profile?.full_name || 'Usuário'}
        userRole={profile?.role || 'visitante'}
        title="Equipamentos e Patrimônio"
        subtitle="Gerencie todos os equipamentos e seus dados de manutenção"
      >
        <div className="space-y-6">
          {/* Alert */}
          {maintenanceAlerts.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-yellow-800">⚠️ {maintenanceAlerts.length} equipamento(s) com alerta de manutenção</p>
                <p className="text-sm text-yellow-700">Verifique os status de manutenção</p>
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
                  placeholder="Pesquisar por nome, código ou fabricante..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos Locais</option>
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
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
              Novo Equipamento
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Equipments Table */}
          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredEquipments.length === 0 ? (
            <EmptyState
              title="Nenhum equipamento encontrado"
              description="Comece cadastrando seu primeiro equipamento"
              action={<Button onClick={() => handleOpenDialog()} className="bg-blue-600 text-white">Criar Equipamento</Button>}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{filteredEquipments.length} Equipamento(s)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Código</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Local</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Manutenção</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Próxima</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEquipments.map(eq => (
                        <tr key={eq.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{eq.name}</p>
                              <p className="text-xs text-gray-500">{eq.manufacturer}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{eq.patrimonial_code}</code>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {eq.location || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(eq.status)}
                              <Badge variant={getStatusColor(eq.status) as any}>{eq.status}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={getMaintenanceColor(eq.maintenance_status || 'ok') as any}>
                              {eq.maintenance_status || 'ok'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {eq.next_maintenance_date ? new Date(eq.next_maintenance_date).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(eq)}
                                className="text-gray-600 hover:bg-gray-100"
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(eq.id)}
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
                <DialogTitle>{editingId ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Atualize os dados do equipamento' : 'Preencha os dados do novo equipamento'}
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

                {/* Code & Manufacturer */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código Patrimonial</label>
                    <input
                      type="text"
                      value={formData.patrimonial_code}
                      onChange={(e) => setFormData({ ...formData, patrimonial_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fabricante</label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
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

                {/* Location, Status, Maintenance */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Local *</label>
                    <select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecionar...</option>
                      {LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manutenção</label>
                    <select
                      value={formData.maintenance_status}
                      onChange={(e) => setFormData({ ...formData, maintenance_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {MAINTENANCE_STATUS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Compra</label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Validade Garantia</label>
                    <input
                      type="date"
                      value={formData.warranty_expiration_date}
                      onChange={(e) => setFormData({ ...formData, warranty_expiration_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Maintenance Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Última Manutenção</label>
                    <input
                      type="date"
                      value={formData.last_maintenance_date}
                      onChange={(e) => setFormData({ ...formData, last_maintenance_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Manutenção</label>
                    <input
                      type="date"
                      value={formData.next_maintenance_date}
                      onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
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
                    {editingId ? 'Atualizar' : 'Criar'} Equipamento
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
}
