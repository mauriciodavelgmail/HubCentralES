'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, LoadingSpinner, EmptyState, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { getOccurrences, createOccurrence, updateOccurrence, deleteOccurrence, Occurrence, getOccurrencesByStatus, getOccurrencesByPriority } from '@/lib/supabase/occurrences';
import { Search, Plus, Trash2, Edit, AlertCircle, CheckCircle, Clock, Eye, Upload } from 'lucide-react';
import { uploadEvidence } from '@/lib/supabase/storage';

const OCCURRENCES_CATEGORIES = ['infraestrutura', 'tecnologia', 'limpeza', 'seguranca', 'administrativo', 'manutencao'];
const STATUSES = ['aberta', 'em_analise', 'em_execucao', 'resolvida', 'fechada'];
const PRIORITIES = ['baixa', 'media', 'alta', 'critica'];

export default function OccurrencesPage() {
  const { user, profile } = useAuth();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'infraestrutura',
    priority: 'media',
    status: 'aberta',
    location: '',
    reporter_id: '',
    responsible_id: '',
    solution: '',
    resolution_date: '',
  });

  // Load occurrences
  useEffect(() => {
    loadOccurrences();
  }, []);

  const loadOccurrences = async () => {
    try {
      setLoading(true);
      const data = await getOccurrences();
      setOccurrences(data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar ocorrências: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (occurrence?: Occurrence) => {
    if (occurrence) {
      setEditingId(occurrence.id);
      setFormData({
        title: occurrence.title,
        description: occurrence.description || '',
        category: occurrence.category,
        priority: occurrence.priority,
        status: occurrence.status,
        location: occurrence.location || '',
        reporter_id: occurrence.reporter_id || '',
        responsible_id: occurrence.responsible_id || '',
        solution: occurrence.solution || '',
        resolution_date: occurrence.resolution_date || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        category: 'infraestrutura',
        priority: 'media',
        status: 'aberta',
        location: '',
        reporter_id: '',
        responsible_id: '',
        solution: '',
        resolution_date: '',
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let evidenceUrl: string | undefined = undefined;

      if (selectedFile) {
        setUploading(true);
        const uploadResult = await uploadEvidence(selectedFile, editingId || '');
        evidenceUrl = uploadResult.url;
        setUploading(false);
      }

      const submitData = {
        ...formData,
        ...(evidenceUrl && { evidence_url: evidenceUrl }),
      };

      if (editingId) {
        await updateOccurrence(editingId, submitData);
      } else {
        await createOccurrence(submitData as any);
      }
      await loadOccurrences();
      setShowDialog(false);
      setSelectedFile(null);
      setError('');
    } catch (err: any) {
      setError('Erro ao salvar ocorrência: ' + err.message);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta ocorrência?')) return;
    try {
      await deleteOccurrence(id);
      await loadOccurrences();
      setError('');
    } catch (err: any) {
      setError('Erro ao deletar ocorrência: ' + err.message);
    }
  };

  const filteredOccurrences = occurrences.filter(occ => {
    const matchesSearch = occ.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || occ.status === filterStatus;
    const matchesPriority = !filterPriority || occ.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolvida':
      case 'fechada':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'em_execucao':
        return <Clock size={16} className="text-blue-600" />;
      case 'aberta':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolvida':
      case 'fechada':
        return 'success';
      case 'em_execucao':
        return 'info';
      case 'em_analise':
        return 'warning';
      case 'aberta':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critica':
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
        title="Ocorrências"
        subtitle="Gerencie todas as ocorrências técnicas e operacionais"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 flex-1">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por título ou descrição..."
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
              Nova Ocorrência
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Occurrences Table */}
          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredOccurrences.length === 0 ? (
            <EmptyState
              title="Nenhuma ocorrência encontrada"
              description="Comece criando sua primeira ocorrência"
              action={<Button onClick={() => handleOpenDialog()} className="bg-blue-600 text-white">Criar Ocorrência</Button>}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{filteredOccurrences.length} Ocorrência(s)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Título</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Categoria</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Prioridade</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Local</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOccurrences.map(occ => (
                        <tr key={occ.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{occ.title}</p>
                              <p className="text-xs text-gray-500">{occ.description?.substring(0, 50)}...</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="info">{occ.category}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={getPriorityColor(occ.priority) as any}>{occ.priority}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(occ.status)}
                              <Badge variant={getStatusColor(occ.status) as any}>{occ.status}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {occ.location || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(occ)}
                                className="text-gray-600 hover:bg-gray-100"
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(occ.id)}
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
                <DialogTitle>{editingId ? 'Editar Ocorrência' : 'Nova Ocorrência'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Atualize os dados da ocorrência' : 'Preencha os dados da nova ocorrência'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Category, Priority, Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {OCCURRENCES_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
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

                {/* Solution */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solução</label>
                  <textarea
                    value={formData.solution}
                    onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Evidence Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evidência (Foto/Vídeo)</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                        <Upload size={18} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {selectedFile ? selectedFile.name : 'Selecionar arquivo'}
                        </span>
                        <input
                          type="file"
                          hidden
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          accept="image/*,video/*"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    {selectedFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>

                {/* Resolution Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Resolução</label>
                  <input
                    type="date"
                    value={formData.resolution_date}
                    onChange={(e) => setFormData({ ...formData, resolution_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={uploading}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={uploading}>
                    {uploading ? 'Enviando...' : (editingId ? 'Atualizar' : 'Criar')} Ocorrência
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
            <Button variant="primary" onClick={handleSubmitOccurrence}>
              Criar Ocorrência
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Intelligent Suggestion */}
          {showSuggestion && suggestion && (
            <Alert variant="info" title="Sugestão Inteligente">
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Prioridade sugerida:</strong> {suggestion.suggestedPriority} (Confiança:{' '}
                  {Math.round(suggestion.confidence * 100)}%)
                </p>
                {suggestion.suggestedDepartment && (
                  <p>
                    <strong>Departamento:</strong> {suggestion.suggestedDepartment}
                  </p>
                )}
                <p>
                  <strong>Prazo recomendado:</strong> {suggestion.suggestedDeadlineDays} dias
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleAcceptSuggestion}>
                    Aceitar sugestão
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSuggestion(false)}
                  >
                    Ignorar
                  </Button>
                </div>
              </div>
            </Alert>
          )}

          <Input label="Título" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />

          <Textarea
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoria"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={OCCURRENCE_CATEGORIES}
            />
            <Select
              label="Prioridade"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { value: 'baixa', label: 'Baixa' },
                { value: 'media', label: 'Média' },
                { value: 'alta', label: 'Alta' },
                { value: 'critica', label: 'Crítica' },
              ]}
            />
          </div>

          <Input label="Local" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />

          <Button variant="outline" onClick={handleGenerateSuggestion} className="w-full">
            <Zap size={18} className="mr-2" />
            Gerar Sugestão Inteligente
          </Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selectedOccurrence && (
        <Modal
          isOpen={!!selectedOccurrence}
          title={selectedOccurrence.occurrence_number}
          onClose={() => setSelectedOccurrence(null)}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">{selectedOccurrence.title}</h3>
              <p className="text-sm text-gray-600 mt-2">{selectedOccurrence.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Status</p>
                <Badge className={STATUS_COLORS[selectedOccurrence.status]}>
                  {selectedOccurrence.status}
                </Badge>
              </div>
              <div>
                <p className="text-gray-600">Prioridade</p>
                <Badge className={PRIORITY_COLORS[selectedOccurrence.priority]}>
                  {selectedOccurrence.priority}
                </Badge>
              </div>
              <div>
                <p className="text-gray-600">Local</p>
                <p className="font-medium">{selectedOccurrence.location}</p>
              </div>
              <div>
                <p className="text-gray-600">Categoria</p>
                <p className="font-medium capitalize">{selectedOccurrence.category}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
