"use client";

import { useState } from "react";
import { MoveRight } from "lucide-react";
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
import type { AssetLocation } from "./AssetLocationManagerDialog";

export function BatchEquipmentMovementDialog({
  open,
  onOpenChange,
  equipmentIds,
  locations,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentIds: string[];
  locations: AssetLocation[];
  onMoved: () => Promise<void>;
}) {
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error: movementError } = await supabase.rpc(
      "move_equipments_batch",
      {
        p_equipment_ids: equipmentIds,
        p_destination_location_id: destination,
        p_description: description || null,
      },
    );
    if (movementError) setError(movementError.message);
    else {
      await onMoved();
      onOpenChange(false);
      setDestination("");
      setDescription("");
    }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveRight className="text-orange-600" /> Movimentação em lote
          </DialogTitle>
          <DialogDescription>
            {equipmentIds.length} patrimônio(s) selecionado(s). Cada
            movimentação será registrada individualmente na razão do bem.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Local de destino *
            </span>
            <select
              required
              className="w-full rounded-lg border px-3 py-2"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Selecione</option>
              {locations
                .filter((location) => location.status === "ativo")
                .map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Motivo/observação
            </span>
            <textarea
              rows={3}
              className="w-full rounded-lg border px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Movimentando..." : "Confirmar movimentação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
