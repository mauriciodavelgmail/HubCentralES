"use client";

import { useEffect, useState } from "react";
import { ArchiveX } from "lucide-react";
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

export function BatchEquipmentRetirementDialog({
  open,
  onOpenChange,
  equipmentIds,
  onRetired,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentIds: string[];
  onRetired: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      setError("");
    }
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: retirementError } = await supabase.rpc(
        "retire_equipments_batch",
        { p_equipment_ids: equipmentIds, p_reason: reason },
      );
      if (retirementError) throw retirementError;
      await onRetired();
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir a baixa em lote.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArchiveX className="text-red-600" /> Baixa em lote
          </DialogTitle>
          <DialogDescription>
            {equipmentIds.length} patrimônio(s) serão baixados. Cada baixa será
            registrada individualmente na razão do respectivo bem.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Motivo da baixa em lote *
            </span>
            <textarea
              required
              minLength={5}
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-red-500"
              placeholder="Informe o motivo aplicável a todos os patrimônios selecionados"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          {busy && (
            <p
              role="status"
              className="rounded-lg bg-blue-50 p-3 text-sm font-medium text-blue-700"
            >
              Processando as baixas e registrando a razão de cada patrimônio...
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Voltar
            </Button>
            <Button type="submit" variant="danger" loading={busy}>
              {busy ? "Processando..." : "Confirmar baixas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
