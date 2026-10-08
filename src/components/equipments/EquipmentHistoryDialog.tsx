"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock3, FileText, History, UserRound } from "lucide-react";
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

type Entry = {
  id: string;
  action: string;
  old_location: string | null;
  new_location: string | null;
  description: string | null;
  changed_by: string;
  created_at: string;
  invoice_number: string | null;
  invoice_url: string | null;
  image_url: string | null;
  actor_name?: string;
};

export function EquipmentHistoryDialog({
  equipment,
  onClose,
}: {
  equipment: Equipment | null;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!equipment) return;
    void (async () => {
      setLoading(true);
      setError("");
      const { data, error: historyError } = await supabase
        .from("equipment_history")
        .select(
          "id,action,old_location,new_location,description,changed_by,created_at,invoice_number,invoice_url,image_url",
        )
        .eq("equipment_id", equipment.id)
        .order("created_at", { ascending: false });
      if (historyError) {
        setError(historyError.message);
        setLoading(false);
        return;
      }
      const userIds = [...new Set((data ?? []).map((item) => item.changed_by))];
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("user_id,full_name,email")
            .in("user_id", userIds)
        : { data: [] };
      const names = new Map(
        (profiles ?? []).map((profile) => [
          profile.user_id,
          profile.full_name || profile.email,
        ]),
      );
      setEntries(
        (data ?? []).map((entry) => ({
          ...entry,
          actor_name: names.get(entry.changed_by) ?? "Usuário do sistema",
        })) as Entry[],
      );
      setLoading(false);
    })();
  }, [equipment]);
  return (
    <Dialog
      open={Boolean(equipment)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto bg-slate-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="text-blue-600" /> Histórico do patrimônio
          </DialogTitle>
          <DialogDescription>
            {equipment?.name} · {equipment?.patrimonial_code}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center p-10">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>
        ) : entries.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            Nenhum histórico registrado.
          </p>
        ) : (
          <div className="relative ml-4 border-l-2 border-blue-200 py-2">
            {entries.map((entry) => (
              <article key={entry.id} className="relative pb-6 pl-8">
                <span className="absolute -left-4 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                  <History size={15} />
                </span>
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <strong className="capitalize text-blue-800">
                      {entry.action.replace(/_/g, " ")}
                    </strong>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock3 size={13} />{" "}
                      {new Date(entry.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {(entry.old_location || entry.new_location) && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>{entry.old_location ?? "Cadastro"}</span>
                      <ArrowRight size={14} className="text-orange-500" />
                      <strong>{entry.new_location}</strong>
                    </div>
                  )}
                  {entry.description && (
                    <p className="mt-3 text-sm text-gray-700">
                      {entry.description}
                    </p>
                  )}
                  <p className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                    <UserRound size={13} /> {entry.actor_name}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.invoice_url && (
                      <a
                        href={entry.invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                      >
                        <FileText size={13} /> NF{" "}
                        {entry.invoice_number ?? "anexada"}
                      </a>
                    )}
                    {entry.image_url && (
                      <a
                        href={entry.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700"
                      >
                        Ver foto
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
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
