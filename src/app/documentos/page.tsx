'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, LoadingSpinner, EmptyState, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { getDocuments, createDocument, updateDocument, deleteDocument, Document } from '@/lib/supabase/documents';
import { Search, Plus, Download, Trash2, Edit, AlertCircle, CheckCircle, Clock, Upload } from 'lucide-react';
import { uploadDocument } from '@/lib/supabase/storage';

export default function DocumentosPage() {
  const { user, profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'contratos',
    status: 'ativo',
    file_url: '',
    file_type: 'application/pdf',
    validity_date: '',
    control_id: '',
    tags: [] as string[],
  });

  const CATEGORIES = ['contratos', 'editais', 'pops', 'atas', 'normas', 'relatorios', 'comunicacao_institucional', 'documentos_fiscais', 'patrimonio'];
  const STATUSES = ['ativo', 'vencendo', 'vencido', 'arquivado'];

  // Load documents
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await getDocuments();
      setDocuments(data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar documentos: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (doc?: Document) => {
    if (doc) {
      setEditingId(doc.id);
      setFormData({
        title: doc.title,
        description: doc.description || '',
        category: doc.category,
        status: doc.status,
        file_url: doc.file_url,
        file_type: doc.file_type,
        validity_date: doc.validity_date || '',
        control_id: doc.control_id,
        tags: doc.tags || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        category: 'contratos',
        status: 'ativo',
        file_url: '',
        file_type: 'application/pdf',
        validity_date: '',
        control_id: '',
        tags: [],
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalFileUrl = formData.file_url;

      if (selectedFile) {
        setUploading(true);
        const uploadResult = await uploadDocument(selectedFile, 'documents');
        finalFileUrl = uploadResult.url;
        setUploading(false);
      }

      const submitData = { ...formData, file_url: finalFileUrl };

      if (editingId) {
        await updateDocument(editingId, submitData);
      } else {
        await createDocument(submitData as any);
      }
      await loadDocuments();
      setShowDialog(false);
      setSelectedFile(null);
      setError('');
    } catch (err: any) {
      setError('Erro ao salvar documento: ' + err.message);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este documento?')) return;
    try {
      await deleteDocument(id);
      await loadDocuments();
      setError('');
    } catch (err: any) {
      setError('Erro ao deletar documento: ' + err.message);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.control_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativo':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'vencendo':
        return <AlertCircle size={16} className="text-yellow-600" />;
      case 'vencido':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'success';
      case 'vencendo':
        return 'warning';
      case 'vencido':
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout
        userName={profile?.full_name || 'Usuário'}
        userRole={profile?.role || 'visitante'}
        title="Documentos"
        subtitle="Gerencie todos os documentos do HUB ES+"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 flex-1">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por título ou ID de controle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas Categorias</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Novo Documento
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Documents Table */}
          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <EmptyState
              title="Nenhum documento encontrado"
              description="Comece criando seu primeiro documento"
              action={<Button onClick={() => handleOpenDialog()} className="bg-blue-600 text-white">Criar Documento</Button>}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{filteredDocuments.length} Documento(s)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Título</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">ID Controle</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Categoria</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Validade</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map(doc => (
                        <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{doc.title}</p>
                              <p className="text-xs text-gray-500">{doc.description}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{doc.control_id}</code>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="info">{doc.category}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.status)}
                              <Badge variant={getStatusColor(doc.status) as any}>{doc.status}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {doc.validity_date ? new Date(doc.validity_date).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.file_url, '_blank')}
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                <Download size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(doc)}
                                className="text-gray-600 hover:bg-gray-100"
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Atualize os dados do documento' : 'Preencha os dados do novo documento'}
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

                {/* Control ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID de Controle *</label>
                  <input
                    type="text"
                    required
                    value={formData.control_id}
                    onChange={(e) => setFormData({ ...formData, control_id: e.target.value.toUpperCase() })}
                    placeholder="Ex: CT2024001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Apenas letras e números, sem espaços</p>
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* File Upload Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo {!editingId && '*'}</label>
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
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
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
                  {formData.file_url && !selectedFile && (
                    <p className="text-xs text-gray-500 mt-2">✓ Arquivo: <a href={formData.file_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">visualizar</a></p>
                  )}
                </div>

                {/* Validity Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Validade</label>
                  <input
                    type="date"
                    value={formData.validity_date}
                    onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={uploading}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={uploading}>
                    {uploading ? 'Enviando...' : (editingId ? 'Atualizar' : 'Criar')} Documento
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
