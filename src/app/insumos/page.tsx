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
  getSupplies,
  createSupply,
  updateSupply,
  deleteSupply,
  Supply,
  getSuppliesByCritical,
  getSuppliesByCategory,
} from "@/lib/supabase/supplies";
import { supabase } from "@/lib/supabase/auth";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Package,
  History,
  PackagePlus,
  PowerOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  ExternalLink,
  FileText,
  UserRound,
} from "lucide-react";

const CATEGORIES = [
  "limpeza",
  "manutencao",
  "administrativo",
  "tecnologia",
  "seguranca",
  "higiene",
  "outro",
];
const STATUSES = ["normal", "baixo", "critico"];
type ManagedSupply = Supply & { is_active?: boolean };

function stockStatus(supply: ManagedSupply) {
  if (
    supply.minimum_quantity > 0 &&
    supply.current_quantity <= supply.minimum_quantity * 0.5
  )
    return "critico";
  if (
    supply.minimum_quantity > 0 &&
    supply.current_quantity <= supply.minimum_quantity
  )
    return "baixo";
  return "normal";
}

export default function InsumosPage() {
  const { user, profile } = useAuth();
  const [supplies, setSupplies] = useState<ManagedSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ledgerSupply, setLedgerSupply] = useState<Supply | null>(null);
  const [ledger, setLedger] = useState<
    Array<{
      id: string;
      movement_type: string;
      operation_type: string | null;
      quantity_moved: number;
      balance_before: number | null;
      balance_after: number | null;
      reason: string | null;
      created_at: string;
      created_by: string | null;
      purchase_id: string | null;
      requisition_id: string | null;
      actor_name?: string;
      document_number: string;
      document_href: string;
    }>
  >([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [highlightedMovement, setHighlightedMovement] = useState<string | null>(
    null,
  );
  const [movementLinkHandled, setMovementLinkHandled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const canManage = ["administrador", "administracao"].includes(
    profile?.role || "",
  );

  const processSupplyAlerts = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) return;
    const response = await fetch("/api/supplies/alerts", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.failed)
      setError(
        `Estoque salvo, mas houve falha em ${result.failed ?? 0} e-mail(s) de alerta.`,
      );
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "limpeza",
    code: "",
    supplier: "",
    current_quantity: "",
    minimum_quantity: "",
    unit: "unidade",
    status: "normal",
    unit_cost: "",
    last_purchase_date: "",
  });

  // Load supplies
  useEffect(() => {
    loadSupplies();
    void processSupplyAlerts();
  }, []);

  const loadSupplies = async () => {
    try {
      setLoading(true);
      const data = await getSupplies();
      setSupplies(data as ManagedSupply[]);
      setError("");
    } catch (err: any) {
      setError("Erro ao carregar insumos: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (supply?: ManagedSupply) => {
    if (supply) {
      setEditingId(supply.id);
      setFormData({
        name: supply.name,
        description: supply.description || "",
        category: supply.category,
        code: supply.code || "",
        supplier: supply.supplier || "",
        current_quantity: supply.current_quantity?.toString() || "",
        minimum_quantity: supply.minimum_quantity?.toString() || "",
        unit: supply.unit || "unidade",
        status: supply.status,
        unit_cost: supply.unit_cost?.toString() || "",
        last_purchase_date: supply.last_purchase_date || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        category: "limpeza",
        code: "",
        supplier: "",
        current_quantity: "",
        minimum_quantity: "",
        unit: "unidade",
        status: "normal",
        unit_cost: "",
        last_purchase_date: "",
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        current_quantity: formData.current_quantity
          ? parseInt(formData.current_quantity)
          : 0,
        minimum_quantity: formData.minimum_quantity
          ? parseInt(formData.minimum_quantity)
          : null,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
      };

      if (editingId) {
        await updateSupply(editingId, submitData);
      } else {
        await createSupply(submitData as any);
      }
      await loadSupplies();
      setShowDialog(false);
      setError("");
      await processSupplyAlerts();
    } catch (err: any) {
      setError("Erro ao salvar insumo: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este insumo?")) return;
    try {
      await deleteSupply(id);
      await loadSupplies();
      setError("");
    } catch (err: any) {
      setError("Erro ao deletar insumo: " + err.message);
    }
  };

  const openLedger = async (
    supply: ManagedSupply,
    movementToHighlight?: string,
  ) => {
    setLedgerSupply(supply);
    setHighlightedMovement(movementToHighlight ?? null);
    setLedgerLoading(true);
    const { data, error: ledgerError } = await supabase
      .from("supply_movements")
      .select(
        "id,movement_type,operation_type,quantity_moved,balance_before,balance_after,reason,created_at,created_by,purchase_id,requisition_id",
      )
      .eq("supply_id", supply.id)
      .order("created_at", { ascending: false });
    if (ledgerError)
      setError("Erro ao carregar razão do item: " + ledgerError.message);
    const movements = data ?? [];
    const userIds = [
      ...new Set(
        movements
          .map((movement) => movement.created_by)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const { data: actors } = userIds.length
      ? await supabase
          .from("profiles")
          .select("user_id,full_name,email")
          .in("user_id", userIds)
      : { data: [] };
    const purchaseIds = [
      ...new Set(
        movements
          .map((movement) => movement.purchase_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const requisitionIds = [
      ...new Set(
        movements
          .map((movement) => movement.requisition_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const [{ data: purchaseDocuments }, { data: requisitionDocuments }] =
      await Promise.all([
        purchaseIds.length
          ? supabase
              .from("purchases")
              .select("id,purchase_number")
              .in("id", purchaseIds)
          : Promise.resolve({ data: [] }),
        requisitionIds.length
          ? supabase
              .from("supply_requisitions")
              .select("id,requisition_number")
              .in("id", requisitionIds)
          : Promise.resolve({ data: [] }),
      ]);
    const actorNames = new Map(
      (actors ?? []).map((actor) => [
        actor.user_id,
        actor.full_name || actor.email,
      ]),
    );
    const purchaseNumbers = new Map(
      (purchaseDocuments ?? []).map((purchase) => [
        purchase.id,
        purchase.purchase_number,
      ]),
    );
    const requisitionNumbers = new Map(
      (requisitionDocuments ?? []).map((requisition) => [
        requisition.id,
        requisition.requisition_number,
      ]),
    );
    setLedger(
      movements.map((movement) => {
        const purchaseNumber = movement.purchase_id
          ? purchaseNumbers.get(movement.purchase_id)
          : null;
        const requisitionNumber = movement.requisition_id
          ? requisitionNumbers.get(movement.requisition_id)
          : null;
        return {
          ...movement,
          actor_name: movement.created_by
            ? actorNames.get(movement.created_by)
            : undefined,
          document_number:
            purchaseNumber ||
            requisitionNumber ||
            `MOV-${movement.id.slice(0, 8).toUpperCase()}`,
          document_href: movement.purchase_id
            ? `/compras?pedido=${movement.purchase_id}`
            : `/insumos?movimento=${movement.id}`,
        };
      }),
    );
    setLedgerLoading(false);
  };

  useEffect(() => {
    if (movementLinkHandled || supplies.length === 0) return;
    const movementId = new URLSearchParams(window.location.search).get(
      "movimento",
    );
    setMovementLinkHandled(true);
    if (!movementId) return;
    void supabase
      .from("supply_movements")
      .select("supply_id")
      .eq("id", movementId)
      .maybeSingle()
      .then(({ data }) => {
        const supply = supplies.find((item) => item.id === data?.supply_id);
        if (supply) void openLedger(supply, movementId);
      });
  }, [movementLinkHandled, supplies]);

  const toggleSelection = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const deactivateSelected = async () => {
    const ids = [...selectedIds];
    if (
      !ids.length ||
      !confirm(`Desativar ${ids.length} item(ns) selecionado(s)?`)
    )
      return;
    const { error: deactivateError } = await supabase.rpc(
      "deactivate_supplies",
      { p_supply_ids: ids },
    );
    if (deactivateError) {
      setError("Erro ao desativar itens: " + deactivateError.message);
      return;
    }
    setSelectedIds(new Set());
    await loadSupplies();
  };

  const createPurchaseFromSelected = () => {
    if (!selectedIds.size) return;
    window.sessionStorage.setItem(
      "purchase-prefill-supplies",
      JSON.stringify([...selectedIds]),
    );
    window.location.assign("/compras");
  };

  const filteredSupplies = supplies.filter((supply) => {
    const matchesSearch =
      supply.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supply.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supply.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !filterCategory || supply.category === filterCategory;
    const matchesStatus = !filterStatus || stockStatus(supply) === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const criticalItems = supplies.filter((s) => stockStatus(s) === "critico");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "critico":
        return <AlertTriangle size={16} className="text-red-600" />;
      case "baixo":
        return <AlertCircle size={16} className="text-yellow-600" />;
      case "normal":
        return <CheckCircle size={16} className="text-green-600" />;
      default:
        return <Package size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critico":
        return "danger";
      case "baixo":
        return "warning";
      case "normal":
        return "success";
      default:
        return "secondary";
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={["administrador", "administracao", "manutencao", "limpeza"]}
    >
      <MainLayout
        userName={profile?.full_name || "Usuário"}
        userRole={profile?.role || "visitante"}
        title="Insumos e Estoque"
        subtitle="Gerencie todos os insumos e materiais"
      >
        <div className="space-y-6">
          {/* Alert */}
          {criticalItems.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-red-800">
                  ⚠️ {criticalItems.length} item(s) crítico(s)
                </p>
                <p className="text-sm text-red-700">
                  Quantidade abaixo do mínimo recomendado
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 flex-1">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
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
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos Status</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
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
              action={
                <Button
                  onClick={() => handleOpenDialog()}
                  className="bg-blue-600 text-white"
                >
                  Criar Insumo
                </Button>
              }
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle>{filteredSupplies.length} Insumo(s)</CardTitle>
                  {canManage && selectedIds.size > 0 && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <span className="self-center text-sm font-medium text-blue-700">
                        {selectedIds.size} selecionado(s)
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={createPurchaseFromSelected}
                      >
                        <PackagePlus size={16} /> Gerar pedido de compras
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void deactivateSelected()}
                      >
                        <PowerOff size={16} /> Desativar item(ns)
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="w-12 px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            aria-label="Selecionar todos os insumos ativos"
                            disabled={!canManage}
                            checked={
                              filteredSupplies.filter(
                                (item) => item.is_active !== false,
                              ).length > 0 &&
                              filteredSupplies
                                .filter((item) => item.is_active !== false)
                                .every((item) => selectedIds.has(item.id))
                            }
                            onChange={(event) => {
                              const activeIds = filteredSupplies
                                .filter((item) => item.is_active !== false)
                                .map((item) => item.id);
                              setSelectedIds((current) => {
                                const next = new Set(current);
                                activeIds.forEach((id) =>
                                  event.target.checked
                                    ? next.add(id)
                                    : next.delete(id),
                                );
                                return next;
                              });
                            }}
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Nome
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Código
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Categoria
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Quantidade
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSupplies.map((supply) => (
                        <tr
                          key={supply.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${supply.is_active === false ? "opacity-55" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label={`Selecionar ${supply.name}`}
                              disabled={
                                !canManage || supply.is_active === false
                              }
                              checked={selectedIds.has(supply.id)}
                              onChange={() => toggleSelection(supply.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {supply.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {supply.supplier}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {supply.code}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="info">{supply.category}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900 font-semibold">
                              {supply.current_quantity}{" "}
                              <span className="text-xs text-gray-500">
                                {supply.unit}
                              </span>
                            </div>
                            {supply.minimum_quantity && (
                              <p className="text-xs text-gray-500">
                                Mín: {supply.minimum_quantity}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(stockStatus(supply))}
                              <Badge
                                variant={
                                  getStatusColor(stockStatus(supply)) as any
                                }
                              >
                                {stockStatus(supply)}
                              </Badge>
                              {supply.is_active === false && (
                                <Badge variant="secondary">inativo</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Razão do item"
                                disabled={selectedIds.size > 1}
                                onClick={() => void openLedger(supply)}
                                className="text-blue-700 hover:bg-blue-50"
                              >
                                <History size={16} />
                              </Button>
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
                <DialogTitle>
                  {editingId ? "Editar Insumo" : "Novo Insumo"}
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? "Atualize os dados do insumo"
                    : "Preencha os dados do novo insumo"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Code & Supplier */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fornecedor
                    </label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) =>
                        setFormData({ ...formData, supplier: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Category, Unit, Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quantity */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      value={formData.current_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          current_quantity: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade Mínima
                    </label>
                    <input
                      type="number"
                      value={formData.minimum_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minimum_quantity: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custo Unitário
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_cost: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Last Purchase Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Última Compra
                  </label>
                  <input
                    type="date"
                    value={formData.last_purchase_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        last_purchase_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                    {editingId ? "Atualizar" : "Criar"} Insumo
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={Boolean(ledgerSupply)}
            onOpenChange={(open) => !open && setLedgerSupply(null)}
          >
            <DialogContent className="max-h-[94dvh] max-w-4xl overflow-y-auto bg-slate-50">
              <DialogHeader className="rounded-2xl bg-gradient-to-r from-blue-700 to-cyan-600 p-5 text-white shadow-sm">
                <DialogTitle className="text-xl text-white">
                  Razão do item
                </DialogTitle>
                <DialogDescription className="text-blue-50">
                  Roadmap completo e rastreável de todas as movimentações.
                </DialogDescription>
                {ledgerSupply && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <LedgerSummary label="Insumo" value={ledgerSupply.name} />
                    <LedgerSummary label="Código" value={ledgerSupply.code} />
                    <LedgerSummary
                      label="Saldo atual"
                      value={`${ledgerSupply.current_quantity} ${ledgerSupply.unit}`}
                    />
                    <LedgerSummary
                      label="Estoque mínimo"
                      value={`${ledgerSupply.minimum_quantity} ${ledgerSupply.unit}`}
                    />
                  </div>
                )}
              </DialogHeader>
              {ledgerLoading ? (
                <div className="flex justify-center p-10">
                  <LoadingSpinner />
                </div>
              ) : ledger.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Nenhuma movimentação registrada.
                </p>
              ) : (
                <div className="relative ml-3 space-y-0 border-l-2 border-slate-200 py-2 sm:ml-5">
                  {ledger.map((movement, index) => {
                    const incoming = movement.movement_type === "entrada";
                    return (
                      <article
                        id={`movement-${movement.id}`}
                        key={movement.id}
                        className={`relative pb-7 pl-8 sm:pl-10 ${highlightedMovement === movement.id ? "scroll-mt-4" : ""}`}
                      >
                        <span
                          className={`absolute -left-[18px] top-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-slate-50 text-white shadow-sm ${incoming ? "bg-emerald-500" : "bg-orange-500"}`}
                        >
                          {incoming ? (
                            <ArrowDownToLine size={17} />
                          ) : (
                            <ArrowUpFromLine size={17} />
                          )}
                        </span>
                        <div
                          className={`rounded-2xl border bg-white p-4 shadow-sm transition sm:p-5 ${highlightedMovement === movement.id ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-200 hover:border-blue-200 hover:shadow-md"}`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={incoming ? "success" : "warning"}>
                                {incoming ? "Entrada" : "Saída"}
                              </Badge>
                              <span className="text-sm font-semibold capitalize text-slate-700">
                                {movement.operation_type?.replaceAll(
                                  "_",
                                  " ",
                                ) || "Movimentação de estoque"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock3 size={14} />
                              <time>
                                {new Date(movement.created_at).toLocaleString(
                                  "pt-BR",
                                )}
                              </time>
                            </div>
                          </div>

                          <a
                            href={movement.document_href}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 hover:text-blue-800"
                          >
                            <FileText size={16} />
                            Documento {movement.document_number}
                            <ExternalLink size={14} />
                          </a>

                          <p className="mt-4 text-sm leading-relaxed text-slate-700">
                            {movement.reason || "Movimentação de estoque"}
                          </p>

                          <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-slate-500">
                                Movimento
                              </p>
                              <p
                                className={`text-lg font-bold ${incoming ? "text-emerald-700" : "text-orange-700"}`}
                              >
                                {incoming ? "+" : "−"}
                                {movement.quantity_moved}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">
                                Saldo anterior
                              </p>
                              <p className="text-lg font-bold text-slate-800">
                                {movement.balance_before ?? "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">
                                Novo saldo
                              </p>
                              <p className="text-lg font-bold text-blue-700">
                                {movement.balance_after ?? "—"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                            <UserRound size={14} />
                            <span>Responsável:</span>
                            <strong className="text-slate-700">
                              {movement.actor_name ||
                                movement.created_by ||
                                "não identificado"}
                            </strong>
                            <span className="ml-auto text-slate-400">
                              #{ledger.length - index}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setLedgerSupply(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

function LedgerSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-wide text-blue-100">
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-sm font-semibold text-white"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
