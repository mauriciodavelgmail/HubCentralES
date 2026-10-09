"use client";

import { useEffect, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Barcode, Download, QrCode } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import type { Equipment } from "@/lib/supabase/equipments";

type CodeType = "qr" | "barcode";

async function generateCode(value: string, type: CodeType) {
  if (type === "qr")
    return QRCode.toDataURL(value, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: "M",
    });
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, {
    format: "CODE128",
    displayValue: false,
    margin: 8,
    height: 90,
    width: 2,
  });
  return canvas.toDataURL("image/png");
}

export function AssetCodePreview({ value }: { value: string }) {
  const [type, setType] = useState<CodeType>("qr");
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!value.trim()) {
      setUrl("");
      return;
    }
    void generateCode(value.trim(), type)
      .then(setUrl)
      .catch(() => setUrl(""));
  }, [value, type]);
  if (!value.trim()) return null;
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">
          Identificação gerada automaticamente
        </span>
        <button
          type="button"
          className="text-xs font-medium text-blue-600"
          onClick={() => setType(type === "qr" ? "barcode" : "qr")}
        >
          {type === "qr" ? "Ver código de barras" : "Ver QR Code"}
        </button>
      </div>
      {url && (
        <img
          src={url}
          alt={type === "qr" ? "QR Code" : "Código de barras"}
          className={`mx-auto object-contain ${type === "qr" ? "h-28 w-28" : "h-20 w-full max-w-xs"}`}
        />
      )}
      <code className="mt-1 block text-center text-xs">{value}</code>
    </div>
  );
}

export function AssetLabelsDialog({
  open,
  onOpenChange,
  equipments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipments: Equipment[];
}) {
  const [type, setType] = useState<CodeType>("qr");
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.all(
      equipments
        .slice(0, 8)
        .map(
          async (equipment) =>
            [
              equipment.id,
              await generateCode(equipment.patrimonial_code, type),
            ] as const,
        ),
    ).then((entries) => active && setPreview(Object.fromEntries(entries)));
    return () => {
      active = false;
    };
  }, [open, equipments, type]);
  const exportPdf = async () => {
    setBusy(true);
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const margin = 10;
      const gap = 5;
      const labelWidth = (210 - margin * 2 - gap) / 2;
      const labelHeight = 43;
      for (let index = 0; index < equipments.length; index += 1) {
        const position = index % 12;
        if (index > 0 && position === 0) pdf.addPage();
        const column = position % 2;
        const row = Math.floor(position / 2);
        const x = margin + column * (labelWidth + gap);
        const y = margin + row * (labelHeight + 3);
        const equipment = equipments[index];
        const image = await generateCode(equipment.patrimonial_code, type);
        pdf.setDrawColor(190);
        pdf.roundedRect(x, y, labelWidth, labelHeight, 2, 2);
        if (type === "qr") pdf.addImage(image, "PNG", x + 3, y + 3, 29, 29);
        else pdf.addImage(image, "PNG", x + 3, y + 4, 38, 18);
        const textX = type === "qr" ? x + 35 : x + 44;
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(equipment.patrimonial_code, textX, y + 7, {
          maxWidth: labelWidth - (textX - x) - 3,
        });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text(equipment.description || equipment.name, textX, y + 13, {
          maxWidth: labelWidth - (textX - x) - 3,
        });
        pdf.text(`Local: ${equipment.location}`, textX, y + 24, {
          maxWidth: labelWidth - (textX - x) - 3,
        });
        if (type === "barcode")
          pdf.text(equipment.patrimonial_code, x + 5, y + 29, {
            maxWidth: 36,
            align: "center",
          });
      }
      pdf.save(
        `etiquetas-patrimoniais-${type}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "qr" ? <QrCode /> : <Barcode />} Etiquetas patrimoniais
          </DialogTitle>
          <DialogDescription>
            {equipments.length} etiqueta(s), lado a lado com descrição e local
            atual.
          </DialogDescription>
        </DialogHeader>
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setType("qr")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg p-2 ${type === "qr" ? "bg-white shadow" : ""}`}
          >
            <QrCode size={17} /> QR Code
          </button>
          <button
            type="button"
            onClick={() => setType("barcode")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg p-2 ${type === "barcode" ? "bg-white shadow" : ""}`}
          >
            <Barcode size={17} /> Código de barras
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {equipments.slice(0, 8).map((equipment) => (
            <article
              key={equipment.id}
              className="flex min-h-32 items-center gap-3 rounded-xl border p-3"
            >
              {preview[equipment.id] && (
                <img
                  src={preview[equipment.id]}
                  alt=""
                  className={`${type === "qr" ? "h-24 w-24" : "h-16 w-32"} object-contain`}
                />
              )}
              <div className="min-w-0">
                <code className="font-bold">{equipment.patrimonial_code}</code>
                <p className="line-clamp-2 text-sm">
                  {equipment.description || equipment.name}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {equipment.location}
                </p>
              </div>
            </article>
          ))}
        </div>
        {equipments.length > 8 && (
          <p className="text-center text-sm text-gray-500">
            Prévia das primeiras 8. O PDF incluirá todas as {equipments.length}{" "}
            etiquetas.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            disabled={busy || !equipments.length}
            onClick={() => void exportPdf()}
          >
            <Download size={17} /> {busy ? "Gerando..." : "Exportar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
