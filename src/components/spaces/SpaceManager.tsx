"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Pencil, Plus, RefreshCw } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  LoadingSpinner,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/auth";

interface SpaceRecord {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  location: string | null;
  status: string;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  capacity: "",
  location: "",
  status: "disponivel",
};

export function SpaceManager() {
  const [spaces, setSpaces] = useState<SpaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SpaceRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("spaces")
      .select("id,name,description,capacity,location,status")
      .order("name");
    if (error) setFeedback({ type: "error", text: error.message });
    else setSpaces((data ?? []) as SpaceRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSpaces(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSpaces]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (space: SpaceRecord) => {
    setEditing(space);
    setForm({
      name: space.name,
      description: space.description ?? "",
      capacity: String(space.capacity),
      location: space.location ?? "",
      status: space.status,
    });
    setDialogOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      setFeedback({
        type: "error",
        text: "Informe uma lotação máxima maior que zero.",
      });
      return;
    }
    setSaving(true);
    setFeedback(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      capacity,
      location: form.location.trim() || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };
    const result = editing
      ? await supabase.from("spaces").update(payload).eq("id", editing.id)
      : await supabase.from("spaces").insert(payload);

    if (result.error) {
      setFeedback({ type: "error", text: result.error.message });
    } else {
      setFeedback({
        type: "success",
        text: editing
          ? "Ambiente atualizado com sucesso."
          : "Ambiente cadastrado com sucesso.",
      });
      setDialogOpen(false);
      await loadSpaces();
    }
    setSaving(false);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ambientes</h2>
          <p className="mt-1 text-gray-600">
            Cadastre os espaços e defina a lotação máxima de cada um.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadSpaces()}>
            <RefreshCw size={16} /> Atualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Novo ambiente
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type === "error" ? "destructive" : "success"}>
          {feedback.text}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 size={20} /> Ambientes cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="px-3 py-3">Ambiente</th>
                    <th className="px-3 py-3">Localização</th>
                    <th className="px-3 py-3 text-right">Lotação máxima</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {spaces.map((space) => (
                    <tr key={space.id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900">{space.name}</p>
                        <p className="text-xs text-gray-500">{space.description}</p>
                      </td>
                      <td className="px-3 py-3">{space.location || "—"}</td>
                      <td className="px-3 py-3 text-right font-semibold">
                        {space.capacity} pessoas
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={
                            space.status === "disponivel" ? "success" : "secondary"
                          }
                        >
                          {space.status === "disponivel" ? "Disponível" : "Indisponível"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(space)}>
                          <Pencil size={15} /> Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!spaces.length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                        Nenhum ambiente cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar ambiente" : "Novo ambiente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="Nome do ambiente"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input
              label="Localização"
              value={form.location}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value })
              }
            />
            <Input
              label="Lotação máxima"
              type="number"
              min={1}
              required
              placeholder="Informe a capacidade máxima do ambiente"
              value={form.capacity}
              onChange={(event) =>
                setForm({ ...form, capacity: event.target.value })
              }
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
              >
                <option value="disponivel">Disponível</option>
                <option value="indisponivel">Indisponível</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Salvar ambiente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
