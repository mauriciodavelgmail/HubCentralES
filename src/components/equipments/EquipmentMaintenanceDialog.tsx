"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Wrench } from "lucide-react";
import {
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
import type { Equipment } from "@/lib/supabase/equipments";

type Maintenance = {
  id: string;
  maintenance_number: string;
  opening_description: string;
  opened_at: string;
  status: string;
};

function nowLabel() {
  return new Date().toLocaleString("pt-BR");
}

function warrantyEnd(days: string) {
  const amount = Number(days);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  const date = new Date();
  date.setDate(date.getDate() + amount);
  return date.toLocaleDateString("pt-BR");
}

export function EquipmentMaintenanceDialog({
  equipment,
  onClose,
  onCompleted,
}: {
  equipment: Equipment | null;
  onClose: () => void;
  onCompleted: () => Promise<void>;
}) {
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [completionDescription, setCompletionDescription] = useState("");
  const [serviceType, setServiceType] = useState<"interna" | "terceirizada">(
    "interna",
  );
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [serviceValue, setServiceValue] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("");
  const [operationDate] = useState(nowLabel);

  useEffect(() => {
    if (!equipment) return;
    void supabase
      .from("equipment_maintenances")
      .select("id,maintenance_number,opening_description,opened_at,status")
      .eq("equipment_id", equipment.id)
      .eq("status", "aberta")
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        setMaintenance((data as Maintenance | null) ?? null);
        if (loadError) setError(loadError.message);
        setLoading(false);
      });
  }, [equipment]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!equipment) return;
    setBusy(true);
    setError("");
    try {
      if (maintenance) {
        const { error: completeError } = await supabase.rpc(
          "complete_equipment_maintenance",
          {
            p_maintenance_id: maintenance.id,
            p_description: completionDescription,
            p_service_type: serviceType,
            p_supplier: serviceType === "terceirizada" ? supplier : null,
            p_invoice_number:
              serviceType === "terceirizada" ? invoiceNumber || null : null,
            p_service_value:
              serviceType === "terceirizada" && serviceValue
                ? Number(serviceValue.replace(",", "."))
                : null,
            p_warranty_days:
              serviceType === "terceirizada" && warrantyDays
                ? Number(warrantyDays)
                : null,
          },
        );
        if (completeError) throw completeError;
      } else {
        const { error: startError } = await supabase.rpc(
          "start_equipment_maintenance",
          { p_equipment_id: equipment.id, p_description: description },
        );
        if (startError) throw startError;
      }
      await onCompleted();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível registrar a manutenção.",
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
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {maintenance ? (
              <CheckCircle2 className="text-green-600" />
            ) : (
              <Wrench className="text-orange-600" />
            )}
            {maintenance ? "Baixa da manutenção" : "Abrir manutenção"}
          </DialogTitle>
          <DialogDescription>
            {equipment?.patrimonial_code} · {equipment?.name}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center p-10">
            <LoadingSpinner />
          </div>
        ) : equipment ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <ReadOnly label="Local" value={equipment.location} />
              <ReadOnly
                label={maintenance ? "Data da baixa" : "Data de abertura"}
                value={operationDate}
              />
              {maintenance && (
                <ReadOnly
                  label="Controle"
                  value={maintenance.maintenance_number}
                />
              )}
              {maintenance && (
                <ReadOnly
                  label="Aberta em"
                  value={new Date(maintenance.opened_at).toLocaleString(
                    "pt-BR",
                  )}
                />
              )}
            </div>
            {maintenance ? (
              <>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                  <strong>Solicitação:</strong>{" "}
                  {maintenance.opening_description}
                </div>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">
                    Descrição do que foi feito *
                  </span>
                  <textarea
                    required
                    minLength={5}
                    rows={4}
                    className="w-full rounded-lg border px-3 py-2"
                    value={completionDescription}
                    onChange={(event) =>
                      setCompletionDescription(event.target.value)
                    }
                  />
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">
                    Tipo da manutenção *
                  </legend>
                  <div className="flex flex-wrap gap-5">
                    <Radio
                      label="Manutenção interna"
                      checked={serviceType === "interna"}
                      onChange={() => setServiceType("interna")}
                    />
                    <Radio
                      label="Terceirizada"
                      checked={serviceType === "terceirizada"}
                      onChange={() => setServiceType("terceirizada")}
                    />
                  </div>
                </fieldset>
                {serviceType === "terceirizada" && (
                  <div className="grid gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4 sm:grid-cols-2">
                    <TextField
                      label="Fornecedor *"
                      required
                      value={supplier}
                      onChange={setSupplier}
                    />
                    <TextField
                      label="Número da NF (opcional)"
                      value={invoiceNumber}
                      onChange={setInvoiceNumber}
                    />
                    <TextField
                      label="Valor em reais (opcional)"
                      type="number"
                      value={serviceValue}
                      onChange={setServiceValue}
                    />
                    <TextField
                      label="Garantia em dias (opcional)"
                      type="number"
                      value={warrantyDays}
                      onChange={setWarrantyDays}
                    />
                    <div className="sm:col-span-2">
                      <ReadOnly
                        label="Fim da garantia"
                        value={warrantyEnd(warrantyDays)}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Descrição da manutenção *
                </span>
                <textarea
                  required
                  minLength={5}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descreva o problema ou serviço necessário"
                />
              </label>
            )}
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
                Processando e registrando a operação...
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
              <Button type="submit" loading={busy}>
                {maintenance ? "Dar baixa na manutenção" : "Gerar manutenção"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}
function Radio({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="radio" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
function TextField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        required={required}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        className="w-full rounded-lg border bg-white px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
