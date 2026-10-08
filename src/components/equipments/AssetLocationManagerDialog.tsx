"use client";

import { useState } from "react";
import { Edit, MapPin, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/auth";

export type AssetFloor = { id: string; name: string; status: string };
export type AssetLocation = {
  id: string;
  name: string;
  status: string;
  floor_id: string | null;
};

export function AssetLocationManagerDialog({
  open,
  onOpenChange,
  floors,
  locations,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floors: AssetFloor[];
  locations: AssetLocation[];
  userId?: string;
  onSaved: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"location" | "floor">("location");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [floorId, setFloorId] = useState("");
  const [status, setStatus] = useState("ativo");
  const [error, setError] = useState("");
  const reset = (kind: "location" | "floor" = tab) => {
    setTab(kind);
    setEditingId(null);
    setName("");
    setFloorId("");
    setStatus("ativo");
    setError("");
  };
  const edit = (
    item: AssetFloor | AssetLocation,
    kind: "location" | "floor",
  ) => {
    setTab(kind);
    setEditingId(item.id);
    setName(item.name);
    setStatus(item.status);
    setFloorId(
      kind === "location" ? ((item as AssetLocation).floor_id ?? "") : "",
    );
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const table = tab === "floor" ? "asset_floors" : "asset_locations";
    const payload =
      tab === "floor"
        ? { name: name.trim(), status }
        : { name: name.trim(), status, floor_id: floorId || null };
    const query = editingId
      ? supabase.from(table).update(payload).eq("id", editingId)
      : supabase.from(table).insert({ ...payload, created_by: userId });
    const { error: saveError } = await query;
    if (saveError) {
      setError(saveError.message);
      return;
    }
    await onSaved();
    reset(tab);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="text-blue-600" /> Pavimentos e locais
          </DialogTitle>
          <DialogDescription>
            Cadastre ou edite os valores disponíveis nos formulários de
            patrimônio.
          </DialogDescription>
        </DialogHeader>
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => reset("location")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${tab === "location" ? "bg-white shadow" : ""}`}
          >
            Locais
          </button>
          <button
            type="button"
            onClick={() => reset("floor")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${tab === "floor" ? "bg-white shadow" : ""}`}
          >
            Pavimentos
          </button>
        </div>
        <form onSubmit={save} className="space-y-3 rounded-xl border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium">
                {tab === "floor" ? "Nome do pavimento" : "Nome do local"} *
              </span>
              <input
                required
                maxLength={120}
                className="w-full rounded-lg border px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {tab === "location" && (
              <label>
                <span className="mb-1 block text-sm font-medium">
                  Pavimento *
                </span>
                <select
                  required
                  className="w-full rounded-lg border px-3 py-2"
                  value={floorId}
                  onChange={(e) => setFloorId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {floors
                    .filter((f) => f.status === "ativo" || f.id === floorId)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label>
              <span className="mb-1 block text-sm font-medium">Status</span>
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => reset(tab)}>
              Limpar
            </Button>
            <Button type="submit">
              <Plus size={15} /> {editingId ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {(tab === "floor" ? floors : locations).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border bg-white p-3"
            >
              <div>
                <strong>{item.name}</strong>
                <p className="text-xs text-gray-500">
                  {tab === "location"
                    ? floors.find(
                        (f) => f.id === (item as AssetLocation).floor_id,
                      )?.name + " · "
                    : ""}
                  {item.status}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => edit(item, tab)}
              >
                <Edit size={14} /> Editar
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
