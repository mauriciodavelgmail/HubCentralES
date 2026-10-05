"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Edit,
  ExternalLink,
  FileDown,
  Mail,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  LoadingSpinner,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/auth";

interface Participant {
  id: string;
  participant_name: string;
  participant_email: string;
  participant_phone: string;
  document: string | null;
  age: number | null;
  city: string | null;
  neighborhood: string | null;
  access_link: string;
  presence_confirmed: boolean;
  presence_time: string | null;
  invitation_status: string;
  invitation_error: string | null;
}
interface EventInfo {
  id: string;
  title: string;
  start_date: string;
  start_time: string;
  public_registration_token?: string | null;
  public_registration_enabled?: boolean;
}
const EMPTY = {
  name: "",
  document: "",
  age: "",
  city: "",
  neighborhood: "",
  email: "",
  phone: "",
};

export function ParticipantManager({
  event,
  open,
  onClose,
}: {
  event: EventInfo;
  open: boolean;
  onClose: () => void;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publicToken, setPublicToken] = useState(
    event.public_registration_token ?? "",
  );
  const [publicEnabled, setPublicEnabled] = useState(
    Boolean(event.public_registration_enabled),
  );
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("attendance_list")
      .select("*")
      .eq("event_id", event.id)
      .order("participant_name");
    if (loadError) setError(loadError.message);
    else setParticipants((data ?? []) as Participant[]);
    setLoading(false);
  }, [event.id]);
  useEffect(() => {
    if (open) void load();
  }, [load, open]);
  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token}`,
    };
  };
  const notify = async (ids: string[]) => {
    const response = await fetch(
      `/api/events/${event.id}/participants/notify`,
      {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ participantIds: ids }),
      },
    );
    const payload = await response.json();
    setNotice(
      response.ok
        ? payload.skipped
          ? "Nenhum convite pendente ou com falha para enviar."
          : `${payload.sent} convite(s) enviado(s); ${payload.failed} falha(s).`
        : payload.error || payload.failures?.[0]?.error || "Falha no envio.",
    );
    await load();
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      event_id: event.id,
      participant_name: form.name,
      participant_email: form.email,
      participant_phone: form.phone,
      document: form.document || null,
      age: form.age ? Number(form.age) : null,
      city: form.city || null,
      neighborhood: form.neighborhood || null,
      registration_source: "manual",
    };
    const result = editing
      ? await supabase
          .from("attendance_list")
          .update(payload)
          .eq("id", editing)
          .select()
          .single()
      : await supabase
          .from("attendance_list")
          .insert(payload)
          .select()
          .single();
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setForm(EMPTY);
    setEditing(null);
    await load();
    if (!editing) await notify([result.data.id]);
  };
  const edit = (item: Participant) => {
    setEditing(item.id);
    setForm({
      name: item.participant_name,
      document: item.document ?? "",
      age: item.age?.toString() ?? "",
      city: item.city ?? "",
      neighborhood: item.neighborhood ?? "",
      email: item.participant_email,
      phone: item.participant_phone,
    });
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir este participante?")) return;
    await supabase.from("attendance_list").delete().eq("id", id);
    await load();
  };
  const parseCsv = async (file: File) => {
    const text = await file.text();
    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(Boolean);
    if (lines.length < 2) {
      setError("O CSV não possui registros.");
      return;
    }
    const separator = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0]
      .split(separator)
      .map((h) => h.trim().toLowerCase());
    const value = (cols: string[], name: string) =>
      cols[headers.indexOf(name)]?.trim() || "";
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(separator);
      return {
        event_id: event.id,
        participant_name: value(cols, "nome"),
        document: value(cols, "documento") || null,
        age: value(cols, "idade") ? Number(value(cols, "idade")) : null,
        city: value(cols, "cidade") || null,
        neighborhood: value(cols, "bairro") || null,
        participant_email: value(cols, "email"),
        participant_phone: value(cols, "telefone"),
        registration_source: "csv",
      };
    });
    const invalid = rows.find(
      (row) =>
        !row.participant_name ||
        !row.participant_email ||
        !row.participant_phone,
    );
    if (invalid) {
      setError("Todas as linhas precisam de nome, email e telefone.");
      return;
    }
    const { data, error: insertError } = await supabase
      .from("attendance_list")
      .insert(rows)
      .select("id");
    if (insertError) setError(insertError.message);
    else {
      await load();
      await notify((data ?? []).map((item) => item.id));
    }
  };
  const downloadModel = () => {
    const csv =
      "\uFEFFnome;documento;idade;cidade;bairro;email;telefone\nMaria da Silva;123456789;30;Vitória;Centro;maria@email.com;27999999999";
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-participantes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const togglePublic = async () => {
    const response = await fetch(`/api/events/${event.id}/registration`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ enabled: !publicEnabled }),
    });
    const payload = await response.json();
    if (!response.ok) setError(payload.error);
    else {
      setPublicEnabled(payload.public_registration_enabled);
      setPublicToken(payload.public_registration_token);
    }
  };
  const publicUrl =
    publicToken && typeof window !== "undefined"
      ? `${window.location.origin}/inscricao/${publicToken}`
      : "";
  const exportPdf = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text(`Lista de presença — ${event.title}`, 14, 18);
    pdf.setFontSize(10);
    pdf.text(
      `${new Date(`${event.start_date}T12:00:00`).toLocaleDateString("pt-BR")} às ${event.start_time.slice(0, 5)}`,
      14,
      25,
    );
    let y = 36;
    participants.forEach((p, i) => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
      pdf.rect(14, y - 4, 4, 4);
      pdf.text(
        `${i + 1}. ${p.participant_name} | ${p.document || "Documento não informado"} | ${p.participant_email}`,
        21,
        y,
      );
      y += 9;
    });
    pdf.save(`lista-presenca-${event.title.replace(/\W+/g, "-")}.pdf`);
  };
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular participantes — {event.title}</DialogTitle>
        </DialogHeader>
        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
        {notice && (
          <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">
            {notice}
          </p>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={save} className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">
              {editing ? "Editar participante" : "Cadastro manual"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Nome completo *"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Documento"
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
              />
              <p className="-mt-2 text-xs text-gray-500 sm:col-span-2">
                Documento usado somente para simples conferência do acesso.
              </p>
              <Input
                label="Idade"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
              <Input
                label="Cidade"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                label="Bairro"
                value={form.neighborhood}
                onChange={(e) =>
                  setForm({ ...form, neighborhood: e.target.value })
                }
              />
              <Input
                label="E-mail *"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Telefone *"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                <Plus size={16} />
                {editing ? "Salvar" : "Cadastrar e convidar"}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setForm(EMPTY);
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Importação em massa</h3>
              <p className="my-2 text-sm text-gray-600">
                Baixe o modelo, mantenha os cabeçalhos e use CSV separado por
                ponto e vírgula. Nome, e-mail e telefone são obrigatórios.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={downloadModel}>
                  <Download size={16} />
                  Baixar modelo
                </Button>
                <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white">
                  <span className="flex items-center gap-2">
                    <Upload size={16} />
                    Importar CSV
                  </span>
                  <input
                    hidden
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) =>
                      e.target.files?.[0] && void parseCsv(e.target.files[0])
                    }
                  />
                </label>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Inscrição pública</h3>
              <p className="my-2 text-sm text-gray-600">
                Ative para gerar um link compartilhável de autoinscrição.
              </p>
              <Button
                variant={publicEnabled ? "danger" : "primary"}
                onClick={() => void togglePublic()}
              >
                {publicEnabled ? "Desativar link" : "Ativar link público"}
              </Button>
              {publicEnabled && publicUrl && (
                <div className="mt-3 flex gap-2">
                  <input
                    readOnly
                    className="min-w-0 flex-1 rounded border px-2 text-sm"
                    value={publicUrl}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(publicUrl);
                      setNotice("Link copiado.");
                    }}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <h3 className="text-lg font-semibold">
            Participantes ({participants.length})
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPdf}>
              <FileDown size={16} />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => void notify(participants.map((p) => p.id))}
            >
              <Mail size={16} />
              Tentar pendentes e falhos
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center p-10">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[850px] text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 text-left">Nome</th>
                  <th className="p-2 text-left">Contato</th>
                  <th className="p-2 text-left">Convite</th>
                  <th className="p-2 text-left">Presença</th>
                  <th className="p-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{p.participant_name}</td>
                    <td className="p-2">
                      <div>{p.participant_email}</div>
                      <div className="text-xs text-gray-500">
                        {p.participant_phone}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge
                        variant={
                          p.invitation_status === "enviado"
                            ? "success"
                            : p.invitation_status === "falhou"
                              ? "danger"
                              : "warning"
                        }
                        title={p.invitation_error ?? ""}
                      >
                        {p.invitation_status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {p.presence_confirmed ? (
                        <Badge variant="success">
                          <Check size={12} />
                          Confirmada
                        </Badge>
                      ) : (
                        <Badge variant="warning">Pendente</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          title="Abrir QR Code"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `/participante/${p.access_link}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => edit(p)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => void remove(p.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
