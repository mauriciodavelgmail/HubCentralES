"use client";

import React, { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  LoadingSpinner,
  EmptyState,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { useAuth } from "@/lib/auth/context";
import {
  getOccurrences,
  createOccurrence,
  updateOccurrence,
  deleteOccurrence,
  Occurrence,
} from "@/lib/supabase/occurrences";
import { uploadEvidence } from "@/lib/supabase/storage";
import { SupplyRequisitionDialog } from "@/components/supplies/SupplyRequisitionDialog";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  PackagePlus,
} from "lucide-react";

const STATUSES = ["aberta", "em_analise", "resolvida", "fechada", "cancelada"];
const PRIORITIES = ["baixa", "media", "alta", "critica"];
const STATUS_COLORS: Record<string, string> = {
  aberta: "bg-blue-100 text-blue-800",
  em_analise: "bg-yellow-100 text-yellow-800",
  resolvida: "bg-green-100 text-green-800",
  fechada: "bg-gray-100 text-gray-800",
  cancelada: "bg-red-100 text-red-800",
};
const PRIORITY_COLORS: Record<string, string> = {
  baixa: "bg-green-100 text-green-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-orange-100 text-orange-800",
  critica: "bg-red-100 text-red-800",
};

export default function OcorrenciasPage() {
  const { user, profile } = useAuth();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [requisitionOccurrence, setRequisitionOccurrence] =
    useState<Occurrence | null>(null);

  const [formData, setFormData] = useState({
    occurrence_number: "",
    title: "",
    description: "",
    location: "",
    category: "manutencao",
    status: "aberta",
    priority: "media",
    solution: "",
    evidence_url: "",
    occurred_at: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadOccurrences();
  }, []);

  useEffect(() => {
    if (!occurrences.length) return;
    const occurrenceId = new URLSearchParams(window.location.search).get(
      "ocorrencia",
    );
    const occurrence = occurrences.find((item) => item.id === occurrenceId);
    if (occurrence) setSearchQuery(occurrence.occurrence_number);
  }, [occurrences]);

  const loadOccurrences = async () => {
    try {
      setLoading(true);
      const data = await getOccurrences();
      setOccurrences(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: any) {
      setError("Erro ao carregar ocorrências: " + err.message);
      setOccurrences([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalEvidenceUrl = formData.evidence_url;

      if (selectedFile) {
        setUploading(true);
        const uploadResult = await uploadEvidence(selectedFile, "evidence");
        finalEvidenceUrl = uploadResult.url;
        setUploading(false);
      }

      const submitData = { ...formData, evidence_url: finalEvidenceUrl };

      if (editingId) {
        await updateOccurrence(editingId, submitData as any);
      } else {
        await createOccurrence(submitData as any);
      }

      await loadOccurrences();
      setShowDialog(false);
      setFormData({
        occurrence_number: "",
        title: "",
        description: "",
        location: "",
        category: "manutencao",
        status: "aberta",
        priority: "media",
        solution: "",
        evidence_url: "",
        occurred_at: new Date().toISOString().split("T")[0],
      });
      setEditingId(null);
      setSelectedFile(null);
    } catch (err: any) {
      setError("Erro ao salvar ocorrência: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja deletar esta ocorrência?")) {
      try {
        await deleteOccurrence(id);
        await loadOccurrences();
      } catch (err: any) {
        setError("Erro ao deletar: " + err.message);
      }
    }
  };

  const handleEdit = (occurrence: Occurrence) => {
    setFormData({
      occurrence_number: occurrence.occurrence_number || "",
      title: occurrence.title || "",
      description: occurrence.description || "",
      location: occurrence.location || "",
      category: occurrence.category || "manutencao",
      status: occurrence.status || "aberta",
      priority: occurrence.priority || "media",
      solution: occurrence.solution || "",
      evidence_url: occurrence.evidence_url || "",
      occurred_at:
        occurrence.occurred_at || new Date().toISOString().split("T")[0],
    });
    setEditingId(occurrence.id);
    setShowDialog(true);
  };

  const filteredOccurrences = occurrences.filter((occ) => {
    const matchSearch =
      occ.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.occurrence_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || occ.status === filterStatus;
    const matchPriority = !filterPriority || occ.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <ProtectedRoute
      allowedRoles={[
        "administrador",
        "administracao",
        "recepcao",
        "manutencao",
        "limpeza",
      ]}
    >
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ocorrências</h1>
              <p className="text-gray-600 mt-1">
                Registre e acompanhe ocorrências e manutenção
              </p>
            </div>
            <Button
              onClick={() => {
                setShowDialog(true);
                setEditingId(null);
                setFormData({
                  occurrence_number: "",
                  title: "",
                  description: "",
                  location: "",
                  category: "manutencao",
                  status: "aberta",
                  priority: "media",
                  solution: "",
                  evidence_url: "",
                  occurred_at: new Date().toISOString().split("T")[0],
                });
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus size={18} className="mr-2" />
              Criar Ocorrência
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por título, número..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridade
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredOccurrences.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="w-12 h-12 text-gray-400" />}
              title="Nenhuma ocorrência"
              description="Comece criando uma novo ocorrência para acompanhamento."
            />
          ) : (
            <div className="grid gap-4">
              {filteredOccurrences.map((occurrence) => (
                <Card
                  key={occurrence.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold">
                        {occurrence.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        #{occurrence.occurrence_number} • {occurrence.location}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={STATUS_COLORS[occurrence.status]}>
                        {occurrence.status}
                      </Badge>
                      <Badge className={PRIORITY_COLORS[occurrence.priority]}>
                        {occurrence.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">
                      {occurrence.description}
                    </p>
                    {occurrence.solution && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                        <strong>Solução:</strong> {occurrence.solution}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setRequisitionOccurrence(occurrence)}
                        variant="outline"
                        size="sm"
                      >
                        <PackagePlus size={16} className="mr-1" />
                        Requisitar insumos
                      </Button>
                      <Button
                        onClick={() => handleEdit(occurrence)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit size={16} className="mr-1" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(occurrence.id)}
                        variant="danger"
                        size="sm"
                      >
                        <Trash2 size={16} className="mr-1" />
                        Deletar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editando" : "Criando"} Ocorrência
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número da Ocorrência
                  </label>
                  <input
                    type="text"
                    value={formData.occurrence_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        occurrence_number: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="manutencao">Manutenção</option>
                    <option value="limpeza">Limpeza</option>
                    <option value="seguranca">Segurança</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Local
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Ocorrência
                </label>
                <input
                  type="date"
                  value={formData.occurred_at}
                  onChange={(e) =>
                    setFormData({ ...formData, occurred_at: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solução
                </label>
                <textarea
                  value={formData.solution}
                  onChange={(e) =>
                    setFormData({ ...formData, solution: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidência (Foto/Vídeo)
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {uploading && (
                  <p className="text-sm text-blue-600 mt-2">Enviando...</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editingId ? "Atualizar" : "Criar"} Ocorrência
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <SupplyRequisitionDialog
          open={Boolean(requisitionOccurrence)}
          occurrence={
            requisitionOccurrence
              ? {
                  id: requisitionOccurrence.id,
                  occurrence_number: requisitionOccurrence.occurrence_number,
                  title: requisitionOccurrence.title,
                }
              : null
          }
          onClose={() => setRequisitionOccurrence(null)}
        />
      </MainLayout>
    </ProtectedRoute>
  );
}
