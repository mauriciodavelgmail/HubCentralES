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
import { uploadDocument, uploadImage } from "@/lib/supabase/storage";
import { EquipmentImportDialog } from "@/components/equipments/EquipmentImportDialog";
import { EquipmentMovementDialog } from "@/components/equipments/EquipmentMovementDialog";
import { EquipmentHistoryDialog } from "@/components/equipments/EquipmentHistoryDialog";
import {
  AssetLocationManagerDialog,
  type AssetFloor,
  type AssetLocation,
} from "@/components/equipments/AssetLocationManagerDialog";
import { InventoryWorkflowDialog } from "@/components/equipments/InventoryWorkflowDialog";
import {
  AssetCodePreview,
  AssetLabelsDialog,
} from "@/components/equipments/AssetLabelsDialog";
import { BatchEquipmentMovementDialog } from "@/components/equipments/BatchEquipmentMovementDialog";
import { supabase } from "@/lib/supabase/auth";
import {
  getEquipments,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  Equipment,
  getEquipmentsByStatus,
  getEquipmentsByLocation,
} from "@/lib/supabase/equipments";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  Wrench,
  AlertTriangle,
  FileSpreadsheet,
  MoveRight,
  History,
  MapPinned,
  ClipboardCheck,
  ArrowUpDown,
  Image as ImageIcon,
  Barcode,
} from "lucide-react";

const LOCATIONS = [
  "auditorio",
  "sala_1",
  "sala_2",
  "hall",
  "cozinha",
  "lab_maker",
  "sala_ti",
  "area_externos",
];
const STATUSES = [
  "disponivel",
  "em_uso",
  "em_manutencao",
  "indisponivel",
  "baixado",
];
const MAINTENANCE_STATUS = ["ok", "atencao", "alerta"];

export default function EquipamentosPage() {
  const { user, profile } = useAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [movementEquipment, setMovementEquipment] = useState<Equipment | null>(
    null,
  );
  const [historyEquipment, setHistoryEquipment] = useState<Equipment | null>(
    null,
  );
  const [equipmentPhoto, setEquipmentPhoto] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [floors, setFloors] = useState<AssetFloor[]>([]);
  const [assetLocations, setAssetLocations] = useState<AssetLocation[]>([]);
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchMovement, setShowBatchMovement] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [imagePreview, setImagePreview] = useState<Equipment | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Equipment;
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });
  const canManage = ["administrador", "administracao"].includes(
    profile?.role || "",
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    patrimonial_code: "",
    manufacturer: "",
    location: "",
    status: "disponivel",
    maintenance_status: "ok",
    purchase_date: "",
    warranty_expiration_date: "",
    last_maintenance_date: "",
    next_maintenance_date: "",
    notes: "",
    floor: "",
    acquisition_source: "",
    invoice_number: "",
    quantity: "1",
    unit: "UNIDADE",
    acquisition_value: "",
    supplier: "",
    serial_number: "",
    model: "",
    asset_location_id: "",
  });

  // Load equipments
  useEffect(() => {
    loadEquipments();
    void loadAssetLocations();
  }, []);

  const loadAssetLocations = async () => {
    const [
      { data: floorData, error: floorError },
      { data: locationData, error: locationError },
    ] = await Promise.all([
      supabase.from("asset_floors").select("id,name,status").order("name"),
      supabase
        .from("asset_locations")
        .select("id,name,status,floor_id")
        .order("name"),
    ]);
    if (floorError || locationError) {
      setError(
        `Erro ao carregar pavimentos e locais: ${floorError?.message || locationError?.message}`,
      );
      return;
    }
    setFloors((floorData ?? []) as AssetFloor[]);
    setAssetLocations((locationData ?? []) as AssetLocation[]);
  };

  const loadEquipments = async () => {
    try {
      setLoading(true);
      const data = await getEquipments();
      setEquipments(data);
      setError("");
    } catch (err: any) {
      setError("Erro ao carregar equipamentos: " + err.message);
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
        description: equipment.description || "",
        patrimonial_code: equipment.patrimonial_code || "",
        manufacturer: equipment.manufacturer || "",
        location: equipment.location || "",
        status: equipment.status,
        maintenance_status: equipment.maintenance_status || "ok",
        purchase_date: equipment.purchase_date || "",
        warranty_expiration_date: equipment.warranty_expiration_date || "",
        last_maintenance_date: equipment.last_maintenance_date || "",
        next_maintenance_date: equipment.next_maintenance_date || "",
        notes: equipment.notes || "",
        floor: equipment.floor || "",
        acquisition_source: equipment.acquisition_source || "",
        invoice_number: equipment.invoice_number || "",
        quantity: String(equipment.quantity || 1),
        unit: equipment.unit || "UNIDADE",
        acquisition_value: equipment.acquisition_value?.toString() || "",
        supplier: equipment.supplier || "",
        serial_number: equipment.serial_number || "",
        model: equipment.model || "",
        asset_location_id: equipment.asset_location_id || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        patrimonial_code: "",
        manufacturer: "",
        location: "",
        status: "disponivel",
        maintenance_status: "ok",
        purchase_date: "",
        warranty_expiration_date: "",
        last_maintenance_date: "",
        next_maintenance_date: "",
        notes: "",
        floor: "",
        acquisition_source: "",
        invoice_number: "",
        quantity: "1",
        unit: "UNIDADE",
        acquisition_value: "",
        supplier: "",
        serial_number: "",
        model: "",
        asset_location_id: "",
      });
    }
    setEquipmentPhoto(null);
    setInvoiceFile(null);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const safeCode = formData.patrimonial_code.replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      );
      const photoUpload = equipmentPhoto
        ? await uploadImage(
            new File([equipmentPhoto], `${safeCode}-${equipmentPhoto.name}`, {
              type: equipmentPhoto.type,
            }),
            "patrimonio/fotos",
          )
        : null;
      const invoiceUpload = invoiceFile
        ? await uploadDocument(
            new File([invoiceFile], `${safeCode}-${invoiceFile.name}`, {
              type: invoiceFile.type,
            }),
            "patrimonio/notas-fiscais",
          )
        : null;
      const payload = {
        ...formData,
        purchase_date: formData.purchase_date || null,
        warranty_expiration_date: formData.warranty_expiration_date || null,
        last_maintenance_date: formData.last_maintenance_date || null,
        next_maintenance_date: formData.next_maintenance_date || null,
        quantity: Math.max(1, Number(formData.quantity) || 1),
        acquisition_value: formData.acquisition_value
          ? Number(formData.acquisition_value)
          : null,
        updated_by: user?.id,
        ...(photoUpload
          ? { image_url: photoUpload.url, image_path: photoUpload.path }
          : {}),
        ...(invoiceUpload
          ? { invoice_url: invoiceUpload.url, invoice_path: invoiceUpload.path }
          : {}),
      };
      if (editingId) {
        await updateEquipment(editingId, {
          ...payload,
          status: formData.status as Equipment["status"],
        });
      } else {
        await createEquipment({ ...payload, created_by: user?.id } as any);
      }
      await loadEquipments();
      setShowDialog(false);
      setError("");
    } catch (err: any) {
      setError("Erro ao salvar equipamento: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este equipamento?")) return;
    try {
      await deleteEquipment(id);
      await loadEquipments();
      setError("");
    } catch (err: any) {
      setError("Erro ao deletar equipamento: " + err.message);
    }
  };

  const filteredEquipments = equipments.filter((eq) => {
    const matchesSearch =
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.patrimonial_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !filterLocation || eq.location === filterLocation;
    const matchesStatus = !filterStatus || eq.status === filterStatus;
    return matchesSearch && matchesLocation && matchesStatus;
  });
  const sortedEquipments = [...filteredEquipments].sort((a, b) => {
    const left = a[sortConfig.key];
    const right = b[sortConfig.key];
    const comparison = String(left ?? "").localeCompare(
      String(right ?? ""),
      "pt-BR",
      {
        numeric: true,
        sensitivity: "base",
      },
    );
    return sortConfig.direction === "asc" ? comparison : -comparison;
  });
  const changeSort = (key: keyof Equipment) =>
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const toggleSelection = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectedEquipments = equipments.filter((equipment) =>
    selectedIds.has(equipment.id),
  );
  const labelEquipments = selectedEquipments.length
    ? selectedEquipments
    : sortedEquipments;

  const maintenanceAlerts = equipments.filter(
    (e) => e.maintenance_status !== "ok",
  );
  const locationOptions = [
    ...new Set([
      ...LOCATIONS,
      ...equipments.map((equipment) => equipment.location).filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "disponivel":
        return <CheckCircle size={16} className="text-green-600" />;
      case "em_manutencao":
        return <AlertTriangle size={16} className="text-yellow-600" />;
      case "desativado":
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Wrench size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponivel":
        return "success";
      case "em_uso":
        return "info";
      case "em_manutencao":
        return "warning";
      case "desativado":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getMaintenanceColor = (status: string) => {
    switch (status) {
      case "ok":
        return "success";
      case "atencao":
        return "warning";
      case "alerta":
        return "danger";
      default:
        return "secondary";
    }
  };

  const sortableHeader = (label: string, key: keyof Equipment) => (
    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-700">
      <button
        type="button"
        onClick={() => changeSort(key)}
        className="inline-flex items-center gap-1 hover:text-blue-700"
      >
        {label}
        <ArrowUpDown
          size={14}
          className={sortConfig.key === key ? "text-blue-600" : "text-gray-400"}
        />
      </button>
    </th>
  );

  return (
    <ProtectedRoute
      allowedRoles={[
        "administrador",
        "administracao",
        "manutencao",
        "recepcao",
        "limpeza",
      ]}
    >
      <MainLayout
        userName={profile?.full_name || "Usuário"}
        userRole={profile?.role || "visitante"}
        title="Equipamentos e Patrimônio"
        subtitle="Gerencie todos os equipamentos e seus dados de manutenção"
      >
        <div className="space-y-6">
          {/* Alert */}
          {maintenanceAlerts.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertTriangle
                className="text-yellow-600 flex-shrink-0"
                size={20}
              />
              <div>
                <p className="font-semibold text-yellow-800">
                  ⚠️ {maintenanceAlerts.length} equipamento(s) com alerta de
                  manutenção
                </p>
                <p className="text-sm text-yellow-700">
                  Verifique os status de manutenção
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
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
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
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowLabels(true)}>
                <Barcode size={18} /> Etiquetas
              </Button>
              {canManage && selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowBatchMovement(true)}
                  className="border-orange-300 text-orange-700"
                >
                  <MoveRight size={18} /> Movimentar {selectedIds.size}
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowInventory(true)}>
                <ClipboardCheck size={18} /> Modo inventário
              </Button>
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowLocationManager(true)}
                  >
                    <MapPinned size={18} /> Pavimentos e locais
                  </Button>
                  <Button variant="outline" onClick={() => setShowImport(true)}>
                    <FileSpreadsheet size={18} /> Importar planilha
                  </Button>
                  <Button
                    onClick={() => handleOpenDialog()}
                    className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus size={20} /> Novo Patrimônio
                  </Button>
                </>
              )}
            </div>
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
              action={
                <Button
                  onClick={() => handleOpenDialog()}
                  className="bg-blue-600 text-white"
                >
                  Criar Equipamento
                </Button>
              }
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {filteredEquipments.length} Equipamento(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="w-10 px-3 py-3 text-left">
                          {canManage && (
                            <input
                              type="checkbox"
                              aria-label="Selecionar todos"
                              checked={
                                sortedEquipments.length > 0 &&
                                sortedEquipments.every((item) =>
                                  selectedIds.has(item.id),
                                )
                              }
                              onChange={(event) =>
                                setSelectedIds((current) => {
                                  const next = new Set(current);
                                  sortedEquipments.forEach((item) =>
                                    event.target.checked
                                      ? next.add(item.id)
                                      : next.delete(item.id),
                                  );
                                  return next;
                                })
                              }
                            />
                          )}
                        </th>
                        <th className="w-16 px-3 py-3 text-left font-semibold text-gray-700">
                          Foto
                        </th>
                        {sortableHeader("Nome", "name")}
                        {sortableHeader("Código", "patrimonial_code")}
                        {sortableHeader("Local", "location")}
                        {sortableHeader("Qtd.", "quantity")}
                        {sortableHeader("Status", "status")}
                        {sortableHeader("Manutenção", "maintenance_status")}
                        {sortableHeader("Próxima", "next_maintenance_date")}
                        {sortableHeader(
                          "Último inventário",
                          "last_inventory_at",
                        )}
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEquipments.map((eq) => (
                        <tr
                          key={eq.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-3 py-3">
                            {canManage && (
                              <input
                                type="checkbox"
                                aria-label={`Selecionar ${eq.name}`}
                                checked={selectedIds.has(eq.id)}
                                onChange={() => toggleSelection(eq.id)}
                              />
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                eq.image_url && setImagePreview(eq)
                              }
                              disabled={!eq.image_url}
                              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border bg-slate-100"
                              title={
                                eq.image_url ? "Ampliar imagem" : "Sem imagem"
                              }
                            >
                              {eq.image_url ? (
                                <img
                                  src={eq.image_url}
                                  alt={eq.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImageIcon
                                  size={20}
                                  className="text-gray-400"
                                />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {eq.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {eq.manufacturer}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {eq.patrimonial_code}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {eq.location || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {eq.quantity || 1} {eq.unit || "UNIDADE"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(eq.status)}
                              <Badge variant={getStatusColor(eq.status) as any}>
                                {eq.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                getMaintenanceColor(
                                  eq.maintenance_status || "ok",
                                ) as any
                              }
                            >
                              {eq.maintenance_status || "ok"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {eq.next_maintenance_date
                              ? new Date(
                                  eq.next_maintenance_date,
                                ).toLocaleDateString("pt-BR")
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {eq.last_inventory_at
                              ? new Date(
                                  eq.last_inventory_at,
                                ).toLocaleDateString("pt-BR")
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Histórico"
                                onClick={() => setHistoryEquipment(eq)}
                              >
                                <History size={16} />
                              </Button>
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Movimentar patrimônio"
                                  onClick={() => setMovementEquipment(eq)}
                                  className="text-orange-600 hover:bg-orange-50"
                                >
                                  <MoveRight size={16} />
                                </Button>
                              )}
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(eq)}
                                  className="text-gray-600 hover:bg-gray-100"
                                >
                                  <Edit size={16} />
                                </Button>
                              )}
                              {profile?.role === "administrador" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(eq.id)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
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
                  {editingId ? "Editar Equipamento" : "Novo Equipamento"}
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? "Atualize os dados do equipamento"
                    : "Preencha os dados do novo equipamento"}
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

                {/* Code & Manufacturer */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código Patrimonial *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.patrimonial_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          patrimonial_code: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fabricante
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          manufacturer: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <AssetCodePreview value={formData.patrimonial_code} />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label>
                    <span className="mb-1 flex items-center justify-between text-sm font-medium">
                      Pavimento *
                      <button
                        type="button"
                        className="text-xs text-blue-600"
                        onClick={() => setShowLocationManager(true)}
                      >
                        Cadastrar
                      </button>
                    </span>
                    <select
                      required
                      className="w-full rounded-lg border px-3 py-2"
                      value={formData.floor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          floor: e.target.value,
                          location: "",
                          asset_location_id: "",
                        })
                      }
                    >
                      <option value="">Selecione</option>
                      {floors
                        .filter(
                          (floor) =>
                            floor.status === "ativo" ||
                            floor.name === formData.floor,
                        )
                        .map((floor) => (
                          <option key={floor.id} value={floor.name}>
                            {floor.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Quantidade *
                    </span>
                    <input
                      required
                      min="1"
                      type="number"
                      className="w-full rounded-lg border px-3 py-2"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Unidade
                    </span>
                    <input
                      className="w-full rounded-lg border px-3 py-2"
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Origem/Aquisição
                    </span>
                    <input
                      className="w-full rounded-lg border px-3 py-2"
                      value={formData.acquisition_source}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          acquisition_source: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Fornecedor
                    </span>
                    <input
                      className="w-full rounded-lg border px-3 py-2"
                      value={formData.supplier}
                      onChange={(e) =>
                        setFormData({ ...formData, supplier: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Nota fiscal
                    </span>
                    <input
                      className="w-full rounded-lg border px-3 py-2"
                      value={formData.invoice_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          invoice_number: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Número de série
                    </span>
                    <input
                      className="w-full rounded-lg border px-3 py-2"
                      value={formData.serial_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          serial_number: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Modelo
                    </span>
                    <input
                      className="w-full rounded-lg border px-3 py-2"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Valor de aquisição
                    </span>
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      className="w-full rounded-lg border px-3 py-2"
                      value={formData.acquisition_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          acquisition_value: e.target.value,
                        })
                      }
                    />
                  </label>
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

                {/* Location, Status, Maintenance */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
                      Local *
                      <button
                        type="button"
                        className="text-xs text-blue-600"
                        onClick={() => setShowLocationManager(true)}
                      >
                        Cadastrar
                      </button>
                    </label>
                    <select
                      required
                      value={formData.asset_location_id}
                      onChange={(e) => {
                        const selected = assetLocations.find(
                          (location) => location.id === e.target.value,
                        );
                        const selectedFloor = floors.find(
                          (floor) => floor.id === selected?.floor_id,
                        );
                        setFormData({
                          ...formData,
                          asset_location_id: e.target.value,
                          location: selected?.name ?? "",
                          floor: selectedFloor?.name ?? formData.floor,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione</option>
                      {assetLocations
                        .filter((location) => {
                          const floor = floors.find(
                            (item) => item.id === location.floor_id,
                          );
                          return (
                            (location.status === "ativo" ||
                              location.id === formData.asset_location_id) &&
                            (!formData.floor || floor?.name === formData.floor)
                          );
                        })
                        .map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                    </select>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manutenção
                    </label>
                    <select
                      value={formData.maintenance_status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maintenance_status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {MAINTENANCE_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Anexar nota fiscal (opcional)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      className="w-full rounded-lg border px-3 py-2"
                      onChange={(e) =>
                        setInvoiceFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Foto do patrimônio (opcional)
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="w-full rounded-lg border px-3 py-2"
                      onChange={(e) =>
                        setEquipmentPhoto(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Compra
                    </label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purchase_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Validade Garantia
                    </label>
                    <input
                      type="date"
                      value={formData.warranty_expiration_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          warranty_expiration_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Maintenance Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Última Manutenção
                    </label>
                    <input
                      type="date"
                      value={formData.last_maintenance_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          last_maintenance_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Próxima Manutenção
                    </label>
                    <input
                      type="date"
                      value={formData.next_maintenance_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          next_maintenance_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
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
                    {editingId ? "Atualizar" : "Criar"} Equipamento
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <EquipmentImportDialog
            open={showImport}
            userId={user?.id}
            onOpenChange={setShowImport}
            onImported={loadEquipments}
          />
          <EquipmentMovementDialog
            equipment={movementEquipment}
            locations={assetLocations}
            onClose={() => setMovementEquipment(null)}
            onMoved={loadEquipments}
          />
          <EquipmentHistoryDialog
            equipment={historyEquipment}
            onClose={() => setHistoryEquipment(null)}
          />
          <BatchEquipmentMovementDialog
            open={showBatchMovement}
            onOpenChange={setShowBatchMovement}
            equipmentIds={[...selectedIds]}
            locations={assetLocations}
            onMoved={async () => {
              setSelectedIds(new Set());
              await loadEquipments();
            }}
          />
          <AssetLabelsDialog
            open={showLabels}
            onOpenChange={setShowLabels}
            equipments={labelEquipments}
          />
          <Dialog
            open={Boolean(imagePreview)}
            onOpenChange={(open) => !open && setImagePreview(null)}
          >
            <DialogContent className="max-w-4xl bg-slate-950 p-3">
              <DialogHeader className="sr-only">
                <DialogTitle>Imagem do patrimônio</DialogTitle>
                <DialogDescription>Imagem ampliada</DialogDescription>
              </DialogHeader>
              {imagePreview?.image_url && (
                <img
                  src={imagePreview.image_url}
                  alt={imagePreview.name}
                  className="max-h-[84dvh] w-full rounded-lg object-contain"
                />
              )}
            </DialogContent>
          </Dialog>
          <AssetLocationManagerDialog
            open={showLocationManager}
            onOpenChange={setShowLocationManager}
            floors={floors}
            locations={assetLocations}
            userId={user?.id}
            onSaved={loadAssetLocations}
          />
          {profile && (
            <InventoryWorkflowDialog
              open={showInventory}
              onOpenChange={setShowInventory}
              currentProfile={profile}
              locations={assetLocations}
              onInventoryUpdated={loadEquipments}
            />
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
