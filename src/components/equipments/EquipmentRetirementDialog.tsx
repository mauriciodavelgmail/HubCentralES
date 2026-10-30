"use client";

import { useEffect, useState } from "react";
import { ArchiveX, RotateCcw } from "lucide-react";
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
import type { Equipment } from "@/lib/supabase/equipments";

export function EquipmentRetirementDialog({
  equipment,
  onClose,
  onCompleted,
}: {
  equipment: Equipment | null;
  onClose: () => void;
  onCompleted: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancelling = equipment?.status === "baixado";

  useEffect(() => {
    setReason("");
    setError("");
  }, [equipment?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!equipment) return;
    setBusy(true);
    setError("");
    try {
      const { error: operationError } = await supabase.rpc(
        cancelling ? "cancel_equipment_retirement" : "retire_equipment",
        { p_equipment_id: equipment.id, p_reason: reason },
      );
      if (operationError) throw operationError;
      await onCompleted();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(equipment)}
      onOpenChange={(open) => !open && !busy && onClose()}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cancelling ? (
              <RotateCcw className="text-blue-600" />
            ) : (
              <ArchiveX className="text-red-600" />
            )}
            {cancelling ? "Cancelar baixa" : "Baixar patrimônio"}
          </DialogTitle>
          <DialogDescription>
            {cancelling
              ? "O patrimônio voltará a ficar disponível. A baixa original continuará registrada na razão."
              : "A baixa altera o status para baixado e cria um lançamento permanente na razão patrimonial."}
          </DialogDescription>
        </DialogHeader>
        {equipment && (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-gray-900">{equipment.name}</p>
              <p className="text-sm text-gray-600">
                {equipment.patrimonial_code} · {equipment.location}
              </p>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {cancelling ? "Motivo do cancelamento *" : "Motivo da baixa *"}
              </span>
              <textarea
                required
                minLength={5}
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva o motivo desta operação"
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
                {cancelling
                  ? "Processando o cancelamento da baixa..."
                  : "Processando a baixa do patrimônio..."}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onClose}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                variant={cancelling ? "primary" : "danger"}
                loading={busy}
              >
                {busy
                  ? "Processando..."
                  : cancelling
                    ? "Confirmar cancelamento"
                    : "Confirmar baixa"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
