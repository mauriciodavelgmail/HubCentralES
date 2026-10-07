"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Minus, Package, Plus, Search, ShoppingBasket } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingSpinner,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/auth";

type Supply = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  current_quantity: number;
  unit: string;
  image_url: string | null;
};
type OccurrenceRef = { id: string; occurrence_number: string; title: string };

export function SupplyRequisitionDialog({
  open,
  onClose,
  occurrence,
}: {
  open: boolean;
  onClose: (created?: boolean) => void;
  occurrence?: OccurrenceRef | null;
}) {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [occurrences, setOccurrences] = useState<OccurrenceRef[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setQuantities({});
    setSelectedOccurrence(occurrence?.id ?? "");
    setObservation(
      occurrence
        ? `Requisição vinculada à ocorrência #${occurrence.occurrence_number} — ${occurrence.title}`
        : "",
    );
    void Promise.all([
      supabase
        .from("supplies")
        .select(
          "id,code,name,description,category,current_quantity,unit,image_url",
        )
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("occurrences")
        .select("id,occurrence_number,title")
        .neq("status", "cancelada")
        .order("created_at", { ascending: false }),
    ]).then(([supplyResult, occurrenceResult]) => {
      if (supplyResult.error) setError(supplyResult.error.message);
      else setSupplies((supplyResult.data ?? []) as Supply[]);
      setOccurrences((occurrenceResult.data ?? []) as OccurrenceRef[]);
      setLoading(false);
    });
  }, [occurrence, open]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return supplies;
    return supplies.filter((item) =>
      [item.code, item.name, item.description, item.category]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [search, supplies]);
  const selectedCount = Object.values(quantities).filter(
    (value) => value > 0,
  ).length;

  const setQuantity = (id: string, value: number) =>
    setQuantities((current) => ({ ...current, [id]: Math.max(0, value) }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([supply_id, quantity]) => ({ supply_id, quantity }));
    if (!items.length) {
      setError("Selecione ao menos um insumo e informe a quantidade.");
      return;
    }
    setSaving(true);
    const { error: submitError } = await supabase.rpc(
      "create_supply_requisition",
      {
        p_items: items,
        p_observation: observation.trim() || null,
        p_occurrence_id: selectedOccurrence || null,
      },
    );
    setSaving(false);
    if (submitError) {
      setError(submitError.message);
      return;
    }
    onClose(true);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[94dvh] max-w-5xl overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingBasket className="text-blue-700" /> Requisição de insumos
          </DialogTitle>
          <DialogDescription>
            A requisição ficará pendente. O estoque só será reduzido após a
            confirmação de baixa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium">
                Vincular a uma ocorrência (opcional)
              </span>
              <select
                disabled={Boolean(occurrence)}
                className="w-full rounded-lg border px-3 py-2"
                value={selectedOccurrence}
                onChange={(e) => setSelectedOccurrence(e.target.value)}
              >
                <option value="">Sem ocorrência vinculada</option>
                {occurrences.map((item) => (
                  <option key={item.id} value={item.id}>
                    #{item.occurrence_number} — {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium">Observação</span>
              <textarea
                rows={2}
                className="w-full rounded-lg border px-3 py-2"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </label>
          </div>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              className="w-full rounded-lg border py-2 pl-10 pr-3"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, descrição ou categoria"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((item) => {
                const quantity = quantities[item.id] ?? 0;
                return (
                  <div
                    key={item.id}
                    className={`flex gap-3 rounded-xl border p-3 transition ${quantity > 0 ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <Package className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.code} · {item.category}
                          </p>
                        </div>
                        <Badge
                          variant={
                            item.current_quantity > 0 ? "success" : "danger"
                          }
                        >
                          {item.current_quantity} {item.unit}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                        {item.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(item.id, quantity - 1)}
                          disabled={quantity === 0}
                        >
                          <Minus size={14} />
                        </Button>
                        <input
                          aria-label={`Quantidade de ${item.name}`}
                          type="number"
                          min="0"
                          className="w-20 rounded-lg border px-2 py-1.5 text-center"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(item.id, Number(e.target.value))
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setQuantity(item.id, quantity + 1)}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <span className="mr-auto self-center text-sm font-medium text-blue-700">
              {selectedCount} item(ns) selecionado(s)
            </span>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Enviar requisição
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
