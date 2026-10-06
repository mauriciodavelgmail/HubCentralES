"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  Edit,
  Eye,
  FileText,
  PackagePlus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { MainLayout } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  LoadingSpinner,
} from "@/components/ui";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/auth";
import { uploadDocument } from "@/lib/supabase/storage";

type PurchaseType = "avulsa" | "insumos";
type Supply = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  supplier: string | null;
  current_quantity: number;
  minimum_quantity: number;
  status: string;
  unit: string;
  unit_cost: number | null;
  last_purchase_date: string | null;
  is_active?: boolean;
};
type CartItem = Supply & {
  purchase_quantity: string;
  purchase_unit_cost: string;
};

type StockStatus = "baixo" | "critico" | "normal";

function getStockStatus(supply: Supply): StockStatus {
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
type PurchaseItem = {
  id: string;
  supply_id: string;
  supply_code_snapshot: string;
  supply_name_snapshot: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  balance_before: number;
  balance_after: number;
};
type Purchase = {
  id: string;
  purchase_number: string;
  purchase_type: PurchaseType;
  description: string | null;
  supplier: string | null;
  total_cost: number | null;
  status: string;
  priority: string;
  justification: string | null;
  notes: string | null;
  expected_delivery_date: string | null;
  fiscal_document_url: string | null;
  cancellation_reason: string | null;
  created_at: string;
  purchase_items?: PurchaseItem[];
};

const EMPTY_FORM = {
  purchase_type: "avulsa" as PurchaseType,
  purchase_number: "",
  description: "",
  supplier: "",
  quantity: "",
  unit_cost: "",
  total_cost: "",
  priority: "media",
  justification: "",
  expected_delivery_date: "",
  notes: "",
};
const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500";
const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value ?? 0),
  );
const showDate = (value: string | null) =>
  value
    ? new Date(
        value + (value.length === 10 ? "T12:00:00" : ""),
      ).toLocaleDateString("pt-BR")
    : "—";

export default function ComprasPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "administrador";
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplyToAdd, setSupplyToAdd] = useState("");
  const [fiscalFile, setFiscalFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [details, setDetails] = useState<Purchase | null>(null);
  const [cancelling, setCancelling] = useState<Purchase | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [batchPrefillHandled, setBatchPrefillHandled] = useState(false);
  const [purchaseLinkHandled, setPurchaseLinkHandled] = useState(false);

  const processSupplyAlerts = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) return;
    const response = await fetch("/api/supplies/alerts", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.failed)
      setNotice((current) =>
        `${current} Alertas de estoque: ${result.sent ?? 0} e-mail(s) enviado(s) e ${result.failed ?? 0} falha(s).`.trim(),
      );
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [purchaseResult, supplyResult] = await Promise.all([
      supabase
        .from("purchases")
        .select("*, purchase_items(*)")
        .order("created_at", { ascending: false }),
      supabase.from("supplies").select("*").order("name"),
    ]);
    if (purchaseResult.error) setError(purchaseResult.error.message);
    else setPurchases((purchaseResult.data ?? []) as Purchase[]);
    if (supplyResult.error) setError(supplyResult.error.message);
    else setSupplies((supplyResult.data ?? []) as Supply[]);
    setLoading(false);
  }, []);
  useEffect(() => void load(), [load]);
  useEffect(() => void processSupplyAlerts(), []);

  useEffect(() => {
    if (purchaseLinkHandled || purchases.length === 0) return;
    const purchaseId = new URLSearchParams(window.location.search).get(
      "pedido",
    );
    setPurchaseLinkHandled(true);
    if (!purchaseId) return;
    const purchase = purchases.find((item) => item.id === purchaseId);
    if (purchase) setDetails(purchase);
  }, [purchaseLinkHandled, purchases]);

  useEffect(() => {
    if (batchPrefillHandled || supplies.length === 0) return;
    setBatchPrefillHandled(true);
    const raw = window.sessionStorage.getItem("purchase-prefill-supplies");
    if (!raw) return;
    window.sessionStorage.removeItem("purchase-prefill-supplies");
    try {
      const ids = JSON.parse(raw) as string[];
      const selected = supplies.filter(
        (supply) => ids.includes(supply.id) && supply.is_active !== false,
      );
      if (!selected.length) return;
      const commonSupplier = selected.every(
        (supply) => supply.supplier === selected[0].supplier,
      )
        ? selected[0].supplier || ""
        : "";
      setEditing(null);
      setForm({
        ...EMPTY_FORM,
        purchase_type: "insumos",
        supplier: commonSupplier,
        description: `Reposição de estoque — ${selected.map((item) => item.name).join(", ")}`,
      });
      setCart(
        selected.map((supply) => ({
          ...supply,
          purchase_quantity: "",
          purchase_unit_cost: "",
        })),
      );
      setFiscalFile(null);
      setShowForm(true);
    } catch {
      window.sessionStorage.removeItem("purchase-prefill-supplies");
    }
  }, [batchPrefillHandled, supplies]);

  const filtered = useMemo(
    () =>
      purchases.filter((purchase) => {
        const term = search.toLowerCase();
        return (
          (!statusFilter || purchase.status === statusFilter) &&
          (!term ||
            purchase.purchase_number.toLowerCase().includes(term) ||
            purchase.description?.toLowerCase().includes(term) ||
            purchase.supplier?.toLowerCase().includes(term))
        );
      }),
    [purchases, search, statusFilter],
  );

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCart([]);
    setFiscalFile(null);
    setError("");
    setShowForm(true);
  };
  const openEdit = (purchase: Purchase) => {
    setEditing(purchase);
    setForm({
      purchase_type: purchase.purchase_type,
      purchase_number: purchase.purchase_number,
      description: purchase.description ?? "",
      supplier: purchase.supplier ?? "",
      quantity: "",
      unit_cost: "",
      total_cost: String(purchase.total_cost ?? ""),
      priority: purchase.priority,
      justification: purchase.justification ?? "",
      expected_delivery_date: purchase.expected_delivery_date ?? "",
      notes: purchase.notes ?? "",
    });
    setCart([]);
    setFiscalFile(null);
    setError("");
    setShowForm(true);
  };
  const addSupply = () => {
    const supply = supplies.find((item) => item.id === supplyToAdd);
    if (!supply || cart.some((item) => item.id === supply.id)) return;
    setCart((items) => [
      ...items,
      {
        ...supply,
        purchase_quantity: "1",
        purchase_unit_cost: "",
      },
    ]);
    setSupplyToAdd("");
  };
  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.purchase_quantity || 0) *
        Number(item.purchase_unit_cost || 0),
    0,
  );

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    let uploadedPath = "";
    try {
      if (editing) {
        if (!isAdmin)
          throw new Error("Somente o Administrador pode alterar pedidos.");
        const { error: updateError } = await supabase
          .from("purchases")
          .update({
            description: form.description || null,
            supplier: form.supplier || null,
            priority: form.priority,
            justification: form.justification || null,
            expected_delivery_date: form.expected_delivery_date || null,
            notes: form.notes || null,
          })
          .eq("id", editing.id);
        if (updateError) throw updateError;
        setNotice(
          "Pedido atualizado. Os itens e saldos originais foram preservados.",
        );
      } else {
        if (!form.purchase_number.trim())
          throw new Error("Informe o número do documento da operação.");
        if (form.purchase_type === "insumos" && cart.length === 0)
          throw new Error("Adicione pelo menos um insumo ao carrinho.");
        if (form.purchase_type === "insumos" && !fiscalFile)
          throw new Error(
            "Anexe o documento da operação da compra de insumos.",
          );
        if (
          form.purchase_type === "insumos" &&
          cart.some(
            (item) =>
              Number(item.purchase_quantity) <= 0 ||
              Number(item.purchase_unit_cost) < 0,
          )
        )
          throw new Error(
            "Preencha quantidade e valor de compra de todos os itens.",
          );
        let upload = null;
        if (fiscalFile) {
          upload = await uploadDocument(fiscalFile, "purchases");
          uploadedPath = upload.path;
        }
        const { error: rpcError } = await supabase.rpc("issue_purchase_order", {
          p_purchase: {
            ...form,
            total_cost:
              form.purchase_type === "insumos" ? cartTotal : form.total_cost,
            fiscal_document_url: upload?.url ?? "",
            fiscal_document_size: upload?.size ?? "",
            fiscal_document_type: upload?.type ?? "",
          },
          p_items: cart.map((item) => ({
            supply_id: item.id,
            quantity: Number(item.purchase_quantity),
            unit_cost: Number(item.purchase_unit_cost),
          })),
        });
        if (rpcError) throw rpcError;
        setNotice(
          "Pedido emitido e movimentações de estoque registradas com sucesso.",
        );
        await processSupplyAlerts();
      }
      setShowForm(false);
      await load();
    } catch (saveError) {
      if (uploadedPath)
        await supabase.storage.from("documents").remove([uploadedPath]);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao emitir pedido.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmCancellation = async () => {
    if (!cancelling || cancelReason.trim().length < 5) return;
    setSaving(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("cancel_purchase_order", {
      p_purchase_id: cancelling.id,
      p_reason: cancelReason.trim(),
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setCancelling(null);
    setCancelReason("");
    setNotice("Pedido cancelado, estoque estornado e histórico registrado.");
    await processSupplyAlerts();
    await load();
  };

  return (
    <ProtectedRoute allowedRoles={["administrador", "administracao"]}>
      <MainLayout
        userName={profile?.full_name || "Usuário"}
        userRole={profile?.role || "visitante"}
        title="Compras"
        subtitle="Pedidos avulsos e aquisições de insumos com controle de estoque"
      >
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Pedidos" value={String(purchases.length)} />
            <Metric
              label="Compras de insumos"
              value={String(
                purchases.filter((p) => p.purchase_type === "insumos").length,
              )}
            />
            <Metric
              label="Valor total"
              value={money(
                purchases
                  .filter((p) => p.status !== "cancelada")
                  .reduce((sum, p) => sum + Number(p.total_cost ?? 0), 0),
              )}
            />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                className={inputClass + " pl-10"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número, descrição ou fornecedor"
              />
            </div>
            <select
              className={inputClass + " lg:w-52"}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="compra_realizada">Compra realizada</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <Button onClick={openNew}>
              <Plus size={18} /> Emitir pedido
            </Button>
          </div>
          {error && <Message danger>{error}</Message>}
          {notice && <Message>{notice}</Message>}
          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nenhum pedido encontrado"
              description="Emita uma compra avulsa ou uma compra de insumos."
              action={<Button onClick={openNew}>Emitir pedido</Button>}
            />
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Pedido</Th>
                      <Th>Tipo</Th>
                      <Th>Descrição / Itens</Th>
                      <Th>Fornecedor</Th>
                      <Th>Valor</Th>
                      <Th>Status</Th>
                      <Th>Ações</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((purchase) => (
                      <tr
                        key={purchase.id}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">
                            {purchase.purchase_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {showDate(purchase.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              purchase.purchase_type === "insumos"
                                ? "info"
                                : "secondary"
                            }
                          >
                            {purchase.purchase_type === "insumos"
                              ? "Insumos"
                              : "Avulsa"}
                          </Badge>
                        </td>
                        <td className="max-w-xs px-4 py-3">
                          <p className="truncate">
                            {purchase.description || "—"}
                          </p>
                          {purchase.purchase_type === "insumos" && (
                            <p className="text-xs text-gray-500">
                              {purchase.purchase_items?.length ?? 0} item(ns)
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {purchase.supplier || "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-700">
                          {money(purchase.total_cost)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              purchase.status === "cancelada"
                                ? "danger"
                                : purchase.status === "concluida"
                                  ? "success"
                                  : "info"
                            }
                          >
                            {purchase.status.replaceAll("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Ver detalhes"
                              onClick={() => setDetails(purchase)}
                            >
                              <Eye size={17} />
                            </Button>
                            {isAdmin && purchase.status !== "cancelada" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Editar pedido"
                                  onClick={() => openEdit(purchase)}
                                >
                                  <Edit size={17} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Cancelar pedido"
                                  className="text-red-700"
                                  onClick={() => {
                                    setCancelling(purchase);
                                    setCancelReason("");
                                  }}
                                >
                                  <Ban size={17} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-h-[94dvh] max-w-6xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Editar pedido" : "Emitir pedido de compra"}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Somente dados administrativos podem ser alterados; itens e saldos ficam preservados."
                    : "Escolha entre compra avulsa ou aquisição de insumos controlados."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-6">
                {!editing && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TypeCard
                      active={form.purchase_type === "avulsa"}
                      icon={<FileText />}
                      title="Compra avulsa"
                      description="Serviços e produtos sem controle de saldo"
                      onClick={() => {
                        setForm({ ...form, purchase_type: "avulsa" });
                        setCart([]);
                      }}
                    />
                    <TypeCard
                      active={form.purchase_type === "insumos"}
                      icon={<PackagePlus />}
                      title="Compra de insumos"
                      description="Um ou mais itens com entrada automática no estoque"
                      onClick={() =>
                        setForm({ ...form, purchase_type: "insumos" })
                      }
                    />
                  </div>
                )}
                <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Número do documento da operação *">
                    <input
                      required
                      disabled={Boolean(editing)}
                      className={inputClass}
                      value={form.purchase_number}
                      onChange={(e) =>
                        setForm({ ...form, purchase_number: e.target.value })
                      }
                      placeholder="NF, pedido, romaneio..."
                    />
                  </Field>
                  <Field label="Fornecedor *">
                    <input
                      required
                      className={inputClass}
                      value={form.supplier}
                      onChange={(e) =>
                        setForm({ ...form, supplier: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Prioridade">
                    <select
                      className={inputClass}
                      value={form.priority}
                      onChange={(e) =>
                        setForm({ ...form, priority: e.target.value })
                      }
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Crítica</option>
                    </select>
                  </Field>
                  <Field label="Descrição *" className="sm:col-span-2">
                    <input
                      required
                      className={inputClass}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Entrega esperada">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.expected_delivery_date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          expected_delivery_date: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field
                    label="Justificativa"
                    className="sm:col-span-2 lg:col-span-3"
                  >
                    <textarea
                      rows={2}
                      className={inputClass}
                      value={form.justification}
                      onChange={(e) =>
                        setForm({ ...form, justification: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Observações"
                    className="sm:col-span-2 lg:col-span-3"
                  >
                    <textarea
                      rows={2}
                      className={inputClass}
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                    />
                  </Field>
                </section>
                {!editing && form.purchase_type === "avulsa" && (
                  <section className="grid gap-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:grid-cols-3">
                    <Field label="Quantidade">
                      <input
                        type="number"
                        min="1"
                        className={inputClass}
                        value={form.quantity}
                        onChange={(e) =>
                          setForm({ ...form, quantity: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Valor unitário">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={form.unit_cost}
                        onChange={(e) =>
                          setForm({ ...form, unit_cost: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Valor total *">
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={form.total_cost}
                        onChange={(e) =>
                          setForm({ ...form, total_cost: e.target.value })
                        }
                      />
                    </Field>
                  </section>
                )}
                {!editing && form.purchase_type === "insumos" && (
                  <CartSection
                    supplies={supplies}
                    cart={cart}
                    setCart={setCart}
                    supplyToAdd={supplyToAdd}
                    setSupplyToAdd={setSupplyToAdd}
                    addSupply={addSupply}
                    total={cartTotal}
                  />
                )}
                {!editing && (
                  <Field
                    label={`Documento da operação (PDF ou imagem)${form.purchase_type === "insumos" ? " *" : ""}`}
                  >
                    <input
                      type="file"
                      required={form.purchase_type === "insumos"}
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      className={inputClass}
                      onChange={(e) =>
                        setFiscalFile(e.target.files?.[0] ?? null)
                      }
                    />
                    <span className="mt-1 block text-xs text-gray-500">
                      O arquivo será registrado automaticamente em Documentos
                      Fiscais.
                    </span>
                  </Field>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" loading={saving}>
                    {editing ? "Salvar alterações" : "Emitir pedido"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(details)}
            onOpenChange={(open) => !open && setDetails(null)}
          >
            <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Pedido {details?.purchase_number}</DialogTitle>
                <DialogDescription>{details?.description}</DialogDescription>
              </DialogHeader>
              {details && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ReadOnly
                      label="Tipo"
                      value={
                        details.purchase_type === "insumos"
                          ? "Compra de insumos"
                          : "Compra avulsa"
                      }
                    />
                    <ReadOnly
                      label="Fornecedor"
                      value={details.supplier || "—"}
                    />
                    <ReadOnly label="Total" value={money(details.total_cost)} />
                  </div>
                  {details.purchase_items?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <Th>Insumo</Th>
                            <Th>Quantidade</Th>
                            <Th>Valor unitário</Th>
                            <Th>Saldo anterior → novo</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.purchase_items.map((item) => (
                            <tr className="border-t" key={item.id}>
                              <td className="p-3">
                                <strong>{item.supply_code_snapshot}</strong> —{" "}
                                {item.supply_name_snapshot}
                              </td>
                              <td className="p-3">{item.quantity}</td>
                              <td className="p-3">{money(item.unit_cost)}</td>
                              <td className="p-3">
                                {item.balance_before} → {item.balance_after}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  {details.fiscal_document_url && (
                    <a
                      href={details.fiscal_document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-700 hover:underline"
                    >
                      <FileText size={17} /> Abrir documento fiscal
                    </a>
                  )}
                  {details.cancellation_reason && (
                    <Message danger>
                      Motivo do cancelamento: {details.cancellation_reason}
                    </Message>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetails(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={Boolean(cancelling)}
            onOpenChange={(open) => !open && setCancelling(null)}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-red-700">
                  Cancelar pedido
                </DialogTitle>
                <DialogDescription>
                  O saldo de todos os insumos será estornado e a operação ficará
                  permanentemente registrada.
                </DialogDescription>
              </DialogHeader>
              <Field label="Motivo do cancelamento *">
                <textarea
                  autoFocus
                  rows={4}
                  className={inputClass}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </Field>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => setCancelling(null)}
                >
                  Voltar
                </Button>
                <Button
                  variant="danger"
                  loading={saving}
                  disabled={cancelReason.trim().length < 5}
                  onClick={() => void confirmCancellation()}
                >
                  <Ban size={17} /> Confirmar cancelamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

function CartSection({
  supplies,
  cart,
  setCart,
  supplyToAdd,
  setSupplyToAdd,
  addSupply,
  total,
}: {
  supplies: Supply[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  supplyToAdd: string;
  setSupplyToAdd: (value: string) => void;
  addSupply: () => void;
  total: number;
}) {
  const [supplySearch, setSupplySearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<StockStatus>>(
    new Set(["baixo", "critico", "normal"]),
  );
  const availableSupplies = useMemo(() => {
    const term = supplySearch.trim().toLocaleLowerCase("pt-BR");
    return supplies.filter((supply) => {
      if (supply.is_active === false) return false;
      if (cart.some((item) => item.id === supply.id)) return false;
      if (!statusFilters.has(getStockStatus(supply))) return false;
      if (!term) return true;
      return [supply.code, supply.name, supply.description, supply.category]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [cart, statusFilters, supplies, supplySearch]);

  useEffect(() => {
    if (
      supplyToAdd &&
      !availableSupplies.some((supply) => supply.id === supplyToAdd)
    )
      setSupplyToAdd("");
  }, [availableSupplies, setSupplyToAdd, supplyToAdd]);

  const toggleStatus = (status: StockStatus) =>
    setStatusFilters((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  return (
    <section className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
      <div>
        <h3 className="font-semibold">Carrinho de insumos</h3>
        <p className="text-sm text-gray-600">
          Dados cadastrais e saldos são somente leitura. Informe quantidade e
          valor atual.
        </p>
      </div>
      <div className="rounded-xl border border-blue-100 bg-white p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Field label="Buscar item por código, descrição ou categoria">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={17}
              />
              <input
                type="search"
                className={inputClass + " pl-10"}
                value={supplySearch}
                onChange={(event) => setSupplySearch(event.target.value)}
                placeholder="Ex.: MNT001, lâmpada ou manutenção"
              />
            </div>
          </Field>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-gray-700">
              Filtrar por status
            </legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  [
                    "baixo",
                    "Baixo",
                    "border-yellow-300 bg-yellow-50 text-yellow-800",
                  ],
                  [
                    "critico",
                    "Crítico",
                    "border-red-300 bg-red-50 text-red-800",
                  ],
                  [
                    "normal",
                    "Normal",
                    "border-green-300 bg-green-50 text-green-800",
                  ],
                ] as Array<[StockStatus, string, string]>
              ).map(([value, label, colors]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${statusFilters.has(value) ? colors : "border-gray-200 bg-gray-50 text-gray-500"}`}
                >
                  <input
                    type="checkbox"
                    checked={statusFilters.has(value)}
                    onChange={() => toggleStatus(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {availableSupplies.length} item(ns) disponível(is) com os filtros
          atuais.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          className={inputClass}
          value={supplyToAdd}
          onChange={(e) => setSupplyToAdd(e.target.value)}
        >
          <option value="">Selecione um insumo</option>
          {availableSupplies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.description || s.name} ({s.category})
            </option>
          ))}
        </select>
        <Button type="button" disabled={!supplyToAdd} onClick={addSupply}>
          <ShoppingCart size={17} /> Adicionar
        </Button>
      </div>
      {cart.length === 0 ? (
        <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500">
          Nenhum insumo adicionado.
        </p>
      ) : (
        <div className="space-y-3">
          {cart.map((item, index) => (
            <div key={item.id} className="rounded-xl border bg-white p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <ReadOnly label="Código" value={item.code} />
                <ReadOnly
                  label="Descrição"
                  value={item.description || item.name}
                />
                <ReadOnly
                  label="Saldo atual / mínimo"
                  value={`${item.current_quantity} / ${item.minimum_quantity} ${item.unit}`}
                />
                <ReadOnly label="Status" value={getStockStatus(item)} />
                <ReadOnly label="Último valor" value={money(item.unit_cost)} />
                <ReadOnly
                  label="Última compra"
                  value={showDate(item.last_purchase_date)}
                />
                <Field label="Quantidade da compra *">
                  <input
                    required
                    type="number"
                    min="1"
                    className={inputClass}
                    value={item.purchase_quantity}
                    onChange={(e) =>
                      setCart((current) =>
                        current.map((entry, i) =>
                          i === index
                            ? { ...entry, purchase_quantity: e.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Valor atual unitário *">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={item.purchase_unit_cost}
                    onChange={(e) =>
                      setCart((current) =>
                        current.map((entry, i) =>
                          i === index
                            ? { ...entry, purchase_unit_cost: e.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <strong>
                  {money(
                    Number(item.purchase_quantity || 0) *
                      Number(item.purchase_unit_cost || 0),
                  )}
                </strong>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-700"
                  onClick={() =>
                    setCart((current) =>
                      current.filter((entry) => entry.id !== item.id),
                    )
                  }
                >
                  <Trash2 size={16} /> Remover
                </Button>
              </div>
            </div>
          ))}
          <div className="text-right text-lg font-bold">
            Total: {money(total)}
          </div>
        </div>
      )}
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
function Message({
  children,
  danger = false,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex gap-2 rounded-lg border p-3 text-sm ${danger ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}
    >
      <AlertCircle className="shrink-0" size={18} />
      {children}
    </div>
  );
}
function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="break-words text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left font-semibold text-gray-700">
      {children}
    </th>
  );
}
function TypeCard({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${active ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
    >
      <span className={active ? "text-blue-700" : "text-gray-500"}>{icon}</span>
      <span>
        <strong className="block">{title}</strong>
        <span className="text-sm text-gray-600">{description}</span>
      </span>
    </button>
  );
}
