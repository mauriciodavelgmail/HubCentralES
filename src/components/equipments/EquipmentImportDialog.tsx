"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
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

type ImportRow = {
  import_row: number;
  patrimonial_code: string;
  name: string;
  description: string | null;
  floor: string | null;
  location: string;
  acquisition_source: string | null;
  invoice_number: string | null;
  invoice_url: string | null;
  supplier: string | null;
  quantity: number;
  unit: string;
  acquisition_value: number | null;
  acquisition_date: string | null;
  serial_number: string | null;
  model: string | null;
  responsible_name: string | null;
  defect_notes: string | null;
  status: "disponivel" | "em_manutencao";
};

type Props = {
  open: boolean;
  userId?: string;
  onOpenChange: (open: boolean) => void;
  onImported: () => Promise<void>;
};

const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const text = (value: unknown) => {
  const result = String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .trim();
  return result && result !== "-" ? result : null;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    return [
      value.message,
      value.details,
      value.hint,
      value.code ? `Código: ${value.code}` : null,
    ]
      .filter(Boolean)
      .join(" — ");
  }
  return String(error || "Erro desconhecido");
}

const numberValue = (value: unknown) => {
  const raw = String(value ?? "").replace(/[^0-9,.-]/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const quantityValue = (value: unknown) => {
  const match = String(value ?? "").match(/\d+/);
  return Math.max(1, match ? Number(match[0]) : 1);
};

const dateValue = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  const match = String(value ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match
    ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
    : null;
};

function uniqueCode(value: unknown, sheet: string, row: number) {
  const candidate = text(value);
  if (candidate && !/[Ee]\+\d+/.test(candidate)) return candidate;
  const safeSheet = normalize(sheet)
    .replace(/[^A-Z0-9]+/g, "-")
    .slice(0, 16);
  return `IMPORT-${safeSheet}-${String(row).padStart(4, "0")}`;
}

function mapSheet(
  rows: unknown[][],
  sheet: string,
  invoiceLinks: Map<string, string>,
): ImportRow[] {
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalize);
    return headers.some((item) =>
      ["NOME", "DESCRICAO", "MODELO", "EQUIPAMENTO"].includes(item),
    );
  });
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map(normalize);
  const find = (...names: string[]) =>
    headers.findIndex((header) => names.includes(header));
  const cell = (row: unknown[], ...names: string[]) => {
    const index = find(...names);
    return index >= 0 ? row[index] : null;
  };

  return rows
    .slice(headerIndex + 1)
    .map((row, offset) => {
      const spreadsheetRow = headerIndex + offset + 2;
      const name = text(
        cell(row, "NOME", "DESCRICAO", "MODELO", "EQUIPAMENTO"),
      );
      if (!name) return null;
      const defect = text(cell(row, "DEFEITO", "ATUALIZACOES 23/01/2026"));
      const location =
        text(cell(row, "LOCAL", "LOCALIZACAO HUB", "LOCALIZACAO HUB ")) ??
        "Local não informado";
      const invoiceNumber = text(cell(row, "NF", "NOTA FISCAL"));
      return {
        import_row: spreadsheetRow,
        patrimonial_code: uniqueCode(
          cell(
            row,
            "N.PATRIMONIO",
            "Nº PATRIMONIO",
            "PATRIMONIO SECULT",
            "ETIQUETA",
          ),
          sheet,
          spreadsheetRow,
        ),
        name,
        description: text(cell(row, "DESCRICAO")),
        floor: text(cell(row, "PAVIMENTO")),
        location,
        acquisition_source: text(cell(row, "AQUISICAO", "DOCUMENTO")),
        invoice_number: invoiceNumber,
        invoice_url: invoiceNumber
          ? (invoiceLinks.get(normalize(invoiceNumber)) ?? null)
          : null,
        supplier: text(cell(row, "FORNECEDOR", "LOJA")),
        quantity: quantityValue(cell(row, "QUANTIDADE", "QT", "QT ")),
        unit: text(cell(row, "UNIDADE")) ?? "UNIDADE",
        acquisition_value: numberValue(
          cell(row, "VALOR AQUISICAO", "VALOR UNITARIO"),
        ),
        acquisition_date: dateValue(
          cell(row, "DATA DO PATRIMONIO", "DATA DE AQUISICAO"),
        ),
        serial_number: text(cell(row, "SERIAL")),
        model: text(cell(row, "MODELO")),
        responsible_name: text(cell(row, "POSSE DO COMPUTADOR", "ALOCADO")),
        defect_notes: defect,
        status:
          defect && normalize(defect) !== "FALSE" && normalize(defect) !== "OK"
            ? "em_manutencao"
            : "disponivel",
      } satisfies ImportRow;
    })
    .filter((row): row is ImportRow => Boolean(row));
}

export function EquipmentImportDialog({
  open,
  userId,
  onOpenChange,
  onImported,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [rowsBySheet, setRowsBySheet] = useState<Record<string, ImportRow[]>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const readWorkbook = async (selectedFile: File) => {
    setBusy(true);
    setMessage("");
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const workbook = await readXlsxFile(selectedFile);
      const invoiceLinks = new Map<string, string>();
      const invoiceSheet = workbook.find(
        ({ sheet }) => normalize(sheet) === "NOTAS FISCAIS",
      );
      if (invoiceSheet) {
        for (const row of invoiceSheet.data.slice(1)) {
          const number = text(row[0]);
          const link = text(row[2]);
          if (number && link) invoiceLinks.set(normalize(number), link);
        }
      }
      const mapped = Object.fromEntries(
        workbook.map(({ sheet, data }) => {
          return [sheet, mapSheet(data as unknown[][], sheet, invoiceLinks)];
        }),
      );
      const compatibleSheets = workbook
        .map(({ sheet }) => sheet)
        .filter((sheet) => mapped[sheet].length > 0);
      setFile(selectedFile);
      setRowsBySheet(mapped);
      setSheetNames(compatibleSheets);
      setSelectedSheet(
        compatibleSheets.includes("GERAL")
          ? "GERAL"
          : (compatibleSheets[0] ?? ""),
      );
      if (!compatibleSheets.length)
        setMessage("Nenhuma aba com cabeçalhos reconhecidos foi encontrada.");
    } catch (error) {
      setMessage(
        `Não foi possível ler a planilha: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const importRows = async () => {
    if (!file || !selectedSheet || !userId) return;
    setBusy(true);
    setMessage("");
    const rows = rowsBySheet[selectedSheet] ?? [];
    try {
      const [{ data: existing, error: existingError }, { data: codeRows }] =
        await Promise.all([
          supabase
            .from("equipments")
            .select("import_row")
            .eq("import_source", file.name)
            .eq("import_sheet", selectedSheet),
          supabase.from("equipments").select("patrimonial_code"),
        ]);
      if (existingError) throw existingError;
      const existingRows = new Set(
        (existing ?? []).map((item: { import_row?: number | null }) =>
          Number(item.import_row),
        ),
      );
      const knownCodes = new Set(
        (codeRows ?? []).map((item) => item.patrimonial_code.toUpperCase()),
      );
      const pending = rows.filter((row) => {
        if (existingRows.has(row.import_row)) return false;
        const code = row.patrimonial_code.toUpperCase();
        if (knownCodes.has(code)) return false;
        knownCodes.add(code);
        return true;
      });
      let imported = 0;
      const failures: string[] = [];
      for (let index = 0; index < pending.length; index += 100) {
        const batch = pending.slice(index, index + 100).map((row) => {
          const { responsible_name: responsibleName, ...equipmentRow } = row;
          return {
            ...equipmentRow,
            description:
              row.description ??
              (responsibleName
                ? `Responsável/posse informado na planilha: ${responsibleName}`
                : null),
            import_source: file.name,
            import_sheet: selectedSheet,
            imported_at: new Date().toISOString(),
            created_by: userId,
            updated_by: userId,
            maintenance_status:
              row.status === "em_manutencao" ? "alerta" : "ok",
          };
        });
        const { error: batchError } = await supabase
          .from("equipments")
          .insert(batch as any);
        if (!batchError) {
          imported += batch.length;
          continue;
        }
        for (const equipment of batch) {
          const { error: rowError } = await supabase
            .from("equipments")
            .insert(equipment as any);
          if (rowError) {
            failures.push(
              `Linha ${equipment.import_row} (${equipment.patrimonial_code}): ${errorMessage(rowError)}`,
            );
            if (failures.length >= 5 && imported === 0) {
              throw new Error(
                `As primeiras linhas foram recusadas pelo banco. ${failures.join(" ")}`,
              );
            }
          } else {
            imported += 1;
          }
        }
      }
      setMessage(
        [
          `${imported} patrimônio(s) importado(s).`,
          `${rows.length - pending.length} linha(s) já processada(s) ou com código patrimonial existente foram ignoradas.`,
          failures.length
            ? `${failures.length} linha(s) falharam:\n${failures.slice(0, 8).join("\n")}${failures.length > 8 ? `\n... e mais ${failures.length - 8}.` : ""}`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      await onImported();
    } catch (error) {
      setMessage(`Falha na importação: ${errorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const preview = rowsBySheet[selectedSheet] ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" /> Importar inventário
          </DialogTitle>
          <DialogDescription>
            Selecione a planilha, confira a aba e a prévia antes de gravar. Uma
            mesma linha não é importada duas vezes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-6 text-center">
            <Upload className="mb-2 text-emerald-700" />
            <strong>{file?.name ?? "Selecionar arquivo Excel"}</strong>
            <span className="text-xs text-gray-500">Formato .xlsx ou .xls</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void readWorkbook(selected);
              }}
            />
          </label>
          {sheetNames.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Aba para importar
              </span>
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={selectedSheet}
                onChange={(event) => setSelectedSheet(event.target.value)}
              >
                {sheetNames.map((sheet) => (
                  <option key={sheet}>{sheet}</option>
                ))}
              </select>
            </label>
          )}
          {preview.length > 0 && (
            <div className="overflow-hidden rounded-xl border">
              <div className="bg-slate-800 px-4 py-3 text-sm text-white">
                {preview.length} linha(s) reconhecida(s). Prévia das primeiras
                8.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-left">
                    <tr>
                      <th className="p-2">Linha</th>
                      <th className="p-2">Patrimônio</th>
                      <th className="p-2">Nome</th>
                      <th className="p-2">Local</th>
                      <th className="p-2">Qtd.</th>
                      <th className="p-2">NF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 8).map((row) => (
                      <tr key={row.import_row} className="border-t">
                        <td className="p-2">{row.import_row}</td>
                        <td className="p-2">{row.patrimonial_code}</td>
                        <td className="max-w-xs p-2">{row.name}</td>
                        <td className="p-2">{row.location}</td>
                        <td className="p-2">{row.quantity}</td>
                        <td className="p-2">{row.invoice_number ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {message && (
            <p className="whitespace-pre-wrap rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              {message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            disabled={busy || !preview.length}
            onClick={() => void importRows()}
          >
            {busy ? "Processando..." : `Importar ${preview.length} registros`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
