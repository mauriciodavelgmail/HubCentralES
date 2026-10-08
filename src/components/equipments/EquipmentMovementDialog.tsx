"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FileText, Image as ImageIcon, MapPin } from "lucide-react";
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
import { uploadDocument, uploadImage } from "@/lib/supabase/storage";
import type { Equipment } from "@/lib/supabase/equipments";

type Props = {
  equipment: Equipment | null;
  onClose: () => void;
  onMoved: () => Promise<void>;
};

export function EquipmentMovementDialog({
  equipment,
  onClose,
  onMoved,
}: Props) {
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoice, setInvoice] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDestination("");
    setDescription("");
    setInvoiceNumber("");
    setInvoice(null);
    setPhoto(null);
    setError("");
  }, [equipment?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!equipment) return;
    setBusy(true);
    setError("");
    try {
      const safeCode = equipment.patrimonial_code.replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      );
      const invoiceUpload = invoice
        ? await uploadDocument(
            new File([invoice], `${safeCode}-${invoice.name}`, {
              type: invoice.type,
            }),
            "patrimonio/notas-fiscais",
          )
        : null;
      const photoUpload = photo
        ? await uploadImage(
            new File([photo], `${safeCode}-${photo.name}`, {
              type: photo.type,
            }),
            "patrimonio/fotos",
          )
        : null;
      const { error: movementError } = await supabase.rpc("move_equipment", {
        p_equipment_id: equipment.id,
        p_destination: destination,
        p_description: description || null,
        p_invoice_number: invoiceNumber || null,
        p_invoice_url: invoiceUpload?.url ?? null,
        p_invoice_path: invoiceUpload?.path ?? null,
        p_image_url: photoUpload?.url ?? null,
        p_image_path: photoUpload?.path ?? null,
      });
      if (movementError) throw movementError;
      await onMoved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro desconhecido.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(equipment)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="text-orange-600" /> Movimentar patrimônio
          </DialogTitle>
          <DialogDescription>
            A movimentação fica registrada com usuário, data, origem, destino e
            anexos.
          </DialogDescription>
        </DialogHeader>
        {equipment && (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid items-center gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <span className="text-xs text-gray-500">Origem</span>
                <p className="font-semibold">{equipment.location}</p>
              </div>
              <ArrowRight className="hidden text-orange-500 sm:block" />
              <label>
                <span className="text-xs text-gray-500">Destino *</span>
                <input
                  required
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </label>
            </div>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-medium">
                  Número da nota fiscal
                </span>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </label>
              <label>
                <span className="mb-1 flex items-center gap-1 text-sm font-medium">
                  <FileText size={15} /> Nota fiscal (opcional)
                </span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="w-full rounded-lg border px-3 py-2"
                  onChange={(e) => setInvoice(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 flex items-center gap-1 text-sm font-medium">
                  <ImageIcon size={15} /> Foto do patrimônio (opcional)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="w-full rounded-lg border px-3 py-2"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Registrando..." : "Confirmar movimentação"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
