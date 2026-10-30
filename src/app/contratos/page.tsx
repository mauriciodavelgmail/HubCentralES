"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
  FileText,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Upload,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MainLayout } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  LoadingSpinner,
} from "@/components/ui";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/auth";
import { deleteFile, uploadDocument } from "@/lib/supabase/storage";

const contractSchema = z
  .object({
    contract_number: z.string().trim().min(3, "Informe o número do contrato."),
    supplier: z.string().trim().min(2, "Informe o fornecedor."),
    subject: z.string().trim().min(3, "Informe o objeto do contrato."),
    description: z.string().trim().optional(),
    start_date: z.string().min(1, "Informe a data inicial."),
    end_date: z.string().min(1, "Informe a data final."),
    value: z.string().optional(),
    status: z.enum([
      "rascunho",
      "ativo",
      "vencendo",
      "vencido",
      "encerrado",
      "cancelado",
    ]),
  })
  .refine((data) => data.start_date <= data.end_date, {
    message: "A vigência final deve ser posterior à inicial.",
    path: ["end_date"],
  });

type ContractForm = z.infer<typeof contractSchema>;
type ContractStatus = ContractForm["status"];
type ContractSortKey =
  | "contract_number"
  | "supplier"
  | "subject"
  | "start_date"
  | "end_date"
  | "value"
  | "status";
interface Contract extends Omit<ContractForm, "value"> {
  id: string;
  value: number | null;
  document_id: string | null;
  document?: { file_url: string; title: string } | null;
  created_at: string;
}

const DEFAULT_VALUES: ContractForm = {
  contract_number: "",
  supplier: "",
  subject: "",
  description: "",
  start_date: "",
  end_date: "",
  value: "",
  status: "ativo",
};
const STATUS_VARIANTS: Record<
  string,
  "success" | "warning" | "danger" | "secondary" | "info"
> = {
  ativo: "success",
  vencendo: "warning",
  vencido: "danger",
  cancelado: "danger",
  encerrado: "secondary",
  rascunho: "info",
};
const STATUS_LABELS: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  vencendo: "Vencendo",
  vencido: "Vencido",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

export default function ContratosPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "">("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [sort, setSort] = useState<{
    key: ContractSortKey;
    direction: "asc" | "desc";
  }>({ key: "contract_number", direction: "asc" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const form = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from("contracts")
      .select("*, document:documents(file_url,title)")
      .order("end_date", { ascending: true });
    if (loadError)
      setError(
        loadError.code === "42P01"
          ? "A migration 006_contracts.sql ainda não foi aplicada no Supabase."
          : loadError.message,
      );
    else setContracts((data ?? []) as Contract[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // The async loader owns the loading lifecycle for this initial fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadContracts();
  }, [loadContracts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = contracts.filter(
      (item) =>
        (!statusFilter || item.status === statusFilter) &&
        (!query ||
          `${item.contract_number} ${item.supplier} ${item.subject}`
            .toLowerCase()
            .includes(query)),
    );

    return result.sort((first, second) => {
      const firstValue = first[sort.key] ?? "";
      const secondValue = second[sort.key] ?? "";
      const comparison =
        typeof firstValue === "number" && typeof secondValue === "number"
          ? firstValue - secondValue
          : String(firstValue).localeCompare(String(secondValue), "pt-BR", {
              numeric: true,
              sensitivity: "base",
            });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [contracts, search, sort, statusFilter]);

  const changeSort = (key: ContractSortKey) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortButton = (label: string, key: ContractSortKey) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-gray-700 hover:text-blue-700"
      onClick={() => changeSort(key)}
    >
      {label}
      {sort.key === key &&
        (sort.direction === "asc" ? (
          <ChevronUp size={15} aria-hidden="true" />
        ) : (
          <ChevronDown size={15} aria-hidden="true" />
        ))}
    </button>
  );

  const openCreate = () => {
    setEditing(null);
    setContractFile(null);
    form.reset(DEFAULT_VALUES);
    setDialogOpen(true);
  };
  const openEdit = (contract: Contract) => {
    setEditing(contract);
    setContractFile(null);
    form.reset({
      ...contract,
      description: contract.description ?? "",
      value: contract.value == null ? "" : String(contract.value),
    });
    setDialogOpen(true);
  };

  const saveContract = form.handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    let uploadedPath: string | null = null;
    let createdDocumentId: string | null = null;
    try {
      if (!editing && !contractFile)
        throw new Error("Anexe o PDF do contrato.");
      if (contractFile && contractFile.type !== "application/pdf")
        throw new Error("O contrato deve ser enviado em formato PDF.");
      if (contractFile && contractFile.size > 10 * 1024 * 1024)
        throw new Error("O PDF do contrato deve ter no máximo 10 MB.");

      if (contractFile) {
        const folderNumber = values.contract_number.replace(
          /[^a-zA-Z0-9_-]+/g,
          "-",
        );
        const uploaded = await uploadDocument(
          contractFile,
          `contracts/${folderNumber}`,
        );
        uploadedPath = uploaded.path;
        const controlSuffix = crypto
          .randomUUID()
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 8)
          .toUpperCase();
        const controlNumber =
          values.contract_number
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 20) || "CONTRATO";
        const { data: document, error: documentError } = await supabase
          .from("documents")
          .insert({
            title: `Contrato ${values.contract_number} - ${values.supplier}`,
            description: values.subject,
            category: "contratos",
            status:
              values.status === "cancelado" || values.status === "encerrado"
                ? "arquivado"
                : "ativo",
            file_url: uploaded.url,
            file_size: uploaded.size,
            file_type: uploaded.type || "application/pdf",
            validity_date: values.end_date,
            control_id: `CT${controlNumber}${controlSuffix}`,
            tags: ["contrato", values.supplier],
            created_by: user?.id,
            updated_by: user?.id,
          })
          .select("id")
          .single();
        if (documentError) throw documentError;
        createdDocumentId = document.id;
      }

      const payload = {
        ...values,
        value: values.value ? Number(values.value.replace(",", ".")) : null,
        document_id: createdDocumentId ?? editing?.document_id ?? null,
        updated_by: user?.id,
        ...(!editing ? { created_by: user?.id } : {}),
      };
      const result = editing
        ? await supabase.from("contracts").update(payload).eq("id", editing.id)
        : await supabase.from("contracts").insert(payload);
      if (result.error) throw result.error;
    } catch (saveError) {
      await Promise.allSettled([
        ...(createdDocumentId
          ? [supabase.from("documents").delete().eq("id", createdDocumentId)]
          : []),
        ...(uploadedPath ? [deleteFile("documents", uploadedPath)] : []),
      ]);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar o contrato.",
      );
      setSaving(false);
      return;
    }
    setSaving(false);
    setDialogOpen(false);
    setContractFile(null);
    await loadContracts();
  });

  const activeCount = contracts.filter(
    (item) => item.status === "ativo",
  ).length;
  return (
    <ProtectedRoute allowedRoles={["administrador", "administracao"]}>
      <MainLayout
        title="Gestão de Contratos"
        subtitle="Administração de contratos e fornecedores"
        onSearch={setSearch}
      >
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
              <p className="mt-1 text-gray-600">
                {activeCount} contrato{activeCount === 1 ? "" : "s"} ativo
                {activeCount === 1 ? "" : "s"}
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus size={20} />
              Novo contrato
            </Button>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative w-full max-w-xl">
                <Search
                  className="absolute left-3 top-2.5 text-gray-400"
                  size={20}
                />
                <Input
                  aria-label="Buscar contratos"
                  placeholder="Buscar por número, fornecedor ou objeto"
                  className="pl-10"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <select
                aria-label="Filtrar contratos por status"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ContractStatus | "")
                }
              >
                <option value="">Todos os status</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="inline-flex self-start rounded-lg border border-gray-200 bg-white p-1"
              aria-label="Formato de exibição"
            >
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "cards"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                aria-pressed={viewMode === "cards"}
              >
                <LayoutGrid size={16} />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                aria-pressed={viewMode === "table"}
              >
                <Table2 size={16} />
                Tabela
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <span>{error}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void loadContracts()}
              >
                <RefreshCw size={15} />
                Tentar novamente
              </Button>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : !filtered.length ? (
            <Card>
              <EmptyState
                icon={<FileText size={42} />}
                title="Nenhum contrato encontrado"
                description="Cadastre o primeiro contrato ou ajuste a busca e os filtros."
                action={
                  <Button onClick={openCreate}>
                    <Plus size={18} />
                    Novo contrato
                  </Button>
                }
              />
            </Card>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filtered.map((contract) => (
                <Card key={contract.id}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {contract.supplier}
                        </p>
                        <p className="text-sm text-gray-600">
                          {contract.subject}
                        </p>
                      </div>
                      <Badge
                        variant={
                          STATUS_VARIANTS[contract.status] ?? "secondary"
                        }
                      >
                        {contract.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="block text-xs text-gray-500">
                          Número
                        </span>
                        {contract.contract_number}
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500">
                          Vigência
                        </span>
                        {new Date(
                          `${contract.start_date}T12:00:00`,
                        ).toLocaleDateString("pt-BR")}{" "}
                        a{" "}
                        {new Date(
                          `${contract.end_date}T12:00:00`,
                        ).toLocaleDateString("pt-BR")}
                      </div>
                      {contract.value != null && (
                        <div>
                          <span className="block text-xs text-gray-500">
                            Valor
                          </span>
                          {contract.value.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      {contract.document?.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              contract.document?.file_url,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          <Eye size={15} />
                          Visualizar PDF
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(contract)}
                      >
                        <Edit2 size={15} />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">
                          {sortButton("Número", "contract_number")}
                        </th>
                        <th className="px-4 py-3">
                          {sortButton("Fornecedor", "supplier")}
                        </th>
                        <th className="px-4 py-3">
                          {sortButton("Objeto", "subject")}
                        </th>
                        <th className="px-4 py-3">
                          {sortButton("Início", "start_date")}
                        </th>
                        <th className="px-4 py-3">
                          {sortButton("Fim", "end_date")}
                        </th>
                        <th className="px-4 py-3">
                          {sortButton("Valor", "value")}
                        </th>
                        <th className="px-4 py-3">
                          {sortButton("Status", "status")}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((contract) => (
                        <tr key={contract.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                            {contract.contract_number}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {contract.supplier}
                          </td>
                          <td className="max-w-xs px-4 py-3 text-gray-700">
                            <span className="line-clamp-2">
                              {contract.subject}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {new Date(
                              `${contract.start_date}T12:00:00`,
                            ).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {new Date(
                              `${contract.end_date}T12:00:00`,
                            ).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                            {contract.value == null
                              ? "—"
                              : contract.value.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                STATUS_VARIANTS[contract.status] ?? "secondary"
                              }
                            >
                              {STATUS_LABELS[contract.status] ??
                                contract.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {contract.document?.file_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  aria-label={`Visualizar PDF do contrato ${contract.contract_number}`}
                                  onClick={() =>
                                    window.open(
                                      contract.document?.file_url,
                                      "_blank",
                                      "noopener,noreferrer",
                                    )
                                  }
                                >
                                  <Eye size={15} />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`Editar contrato ${contract.contract_number}`}
                                onClick={() => openEdit(contract)}
                              >
                                <Edit2 size={15} />
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
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar contrato" : "Novo contrato"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={saveContract} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Número do contrato"
                  error={form.formState.errors.contract_number?.message}
                  {...form.register("contract_number")}
                />
                <Input
                  label="Fornecedor"
                  error={form.formState.errors.supplier?.message}
                  {...form.register("supplier")}
                />
              </div>
              <Input
                label="Objeto"
                error={form.formState.errors.subject?.message}
                {...form.register("subject")}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2"
                  {...form.register("description")}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  type="date"
                  label="Início da vigência"
                  error={form.formState.errors.start_date?.message}
                  {...form.register("start_date")}
                />
                <Input
                  type="date"
                  label="Fim da vigência"
                  error={form.formState.errors.end_date?.message}
                  {...form.register("end_date")}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Valor (R$)"
                  inputMode="decimal"
                  error={form.formState.errors.value?.message}
                  {...form.register("value")}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    {...form.register("status")}
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="vencendo">Vencendo</option>
                    <option value="vencido">Vencido</option>
                    <option value="encerrado">Encerrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  PDF do contrato {!editing && "*"}
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-5 text-sm text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50">
                  <Upload size={18} />
                  <span>
                    {contractFile?.name ??
                      (editing?.document_id
                        ? "Substituir PDF vinculado"
                        : "Selecionar arquivo PDF")}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    required={!editing}
                    className="sr-only"
                    onChange={(event) =>
                      setContractFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Limite de 10 MB. O arquivo será armazenado em documents e
                  vinculado ao cadastro do contrato.
                </p>
              </div>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={saving}>
                  {editing ? "Salvar alterações" : "Cadastrar contrato"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
