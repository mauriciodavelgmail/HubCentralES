"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import {
  Barcode,
  Camera,
  CheckCircle,
  ClipboardCheck,
  Keyboard,
  Save,
  XCircle,
} from "lucide-react";
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
import type { AssetLocation } from "./AssetLocationManagerDialog";

type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
};
type Request = {
  id: string;
  request_code: string;
  requested_at: string;
  deadline: string;
  location_id: string | null;
  all_locations: boolean;
  status: string;
  responsible_profile_id: string;
  responsible_name?: string;
  location_name?: string;
};
type Scope = { id: string; location_id: string; status: string };
type InventoryItem = {
  id: string;
  equipment_id: string;
  expected_location_id: string;
  status: string;
  equipments: {
    id: string;
    patrimonial_code: string;
    name: string;
    status: string;
    image_url: string | null;
    location: string;
  } | null;
};

const messageOf = (error: unknown) =>
  error && typeof error === "object" && "message" in error
    ? String((error as { message: unknown }).message)
    : String(error || "Erro desconhecido");

function duplicateBeep() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 220;
  gain.gain.value = 0.08;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.14);
  oscillator.onended = () => void context.close();
}

function InventoryExecution({
  request,
  locations,
  profile,
  onClose,
  onSaved,
}: {
  request: Request;
  locations: AssetLocation[];
  profile: Profile;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [locationId, setLocationId] = useState(request.location_id ?? "");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const foundRef = useRef(found);
  const [filter, setFilter] = useState("todos");
  const [assetStatusFilter, setAssetStatusFilter] = useState("todos");
  const [mode, setMode] = useState<"typing" | "camera">("typing");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  useEffect(() => {
    foundRef.current = found;
  }, [found]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: scopeData, error: scopeError } = await supabase
      .from("inventory_request_locations")
      .select("id,location_id,status")
      .eq("request_id", request.id)
      .order("status");
    if (scopeError) {
      setError(scopeError.message);
      setLoading(false);
      return;
    }
    const loadedScopes = (scopeData ?? []) as Scope[];
    setScopes(loadedScopes);
    const selected =
      locationId ||
      loadedScopes.find((scope) => scope.status !== "concluido")?.location_id ||
      loadedScopes[0]?.location_id ||
      "";
    if (!locationId) setLocationId(selected);
    if (!selected) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error: itemError } = await supabase
      .from("inventory_items")
      .select(
        "id,equipment_id,expected_location_id,status,equipments(id,patrimonial_code,name,status,image_url,location)",
      )
      .eq("request_id", request.id)
      .eq("expected_location_id", selected);
    if (itemError) setError(itemError.message);
    else {
      const loaded = (data ?? []) as unknown as InventoryItem[];
      setItems(loaded);
      setFound(
        new Set(
          loaded
            .filter((item) => item.status === "encontrado")
            .map((item) => item.equipment_id),
        ),
      );
    }
    setLoading(false);
  }, [request.id, locationId]);
  useEffect(() => {
    void load();
  }, [load]);

  const registerCode = useCallback(
    (raw: string) => {
      const normalized = raw.trim().toLowerCase();
      if (!normalized) return;
      const item = items.find(
        (entry) =>
          entry.equipments?.patrimonial_code.trim().toLowerCase() ===
          normalized,
      );
      if (!item) {
        setError(
          `Patrimônio "${raw.trim()}" não pertence ao ambiente selecionado.`,
        );
        return;
      }
      if (foundRef.current.has(item.equipment_id)) {
        duplicateBeep();
        setError(
          `O patrimônio ${item.equipments?.patrimonial_code} já foi registrado.`,
        );
        return;
      }
      setFound((current) => new Set(current).add(item.equipment_id));
      setError("");
      setCode("");
    },
    [items],
  );

  useEffect(() => {
    if (mode !== "camera" || !videoRef.current) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }
    let active = true;
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (active && result) registerCode(result.getText());
      })
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((caught) =>
        setError(`Não foi possível ativar a câmera: ${messageOf(caught)}`),
      );
    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [mode, registerCode]);

  const save = async (complete: boolean) => {
    if (!locationId) return;
    setBusy(true);
    setError("");
    try {
      if (complete) {
        if (!password) {
          setError("Digite sua senha para concluir o inventário do ambiente.");
          setBusy(false);
          return;
        }
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password,
        });
        if (authError)
          throw new Error("Senha inválida. A conclusão não foi registrada.");
      }
      const { error: saveError } = await supabase.rpc(
        "save_inventory_progress",
        {
          p_request_id: request.id,
          p_location_id: locationId,
          p_found_equipment_ids: [...found],
          p_complete: complete,
        },
      );
      if (saveError) throw saveError;
      setConfirming(false);
      setPassword("");
      await onSaved();
      if (complete && request.all_locations) {
        setLocationId("");
        await load();
      } else onClose();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };
  const visibleItems = items.filter(
    (item) =>
      (filter === "todos" ||
        (filter === "encontrado"
          ? found.has(item.equipment_id)
          : !found.has(item.equipment_id))) &&
      (assetStatusFilter === "todos" ||
        item.equipments?.status === assetStatusFilter),
  );
  const currentScope = scopes.find((scope) => scope.location_id === locationId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[96dvh] max-w-[96vw] overflow-hidden p-0">
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b bg-slate-900 p-4 text-white">
            <DialogTitle className="text-white">
              Inventário {request.request_code}
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              {found.size} de {items.length} patrimônios encontrados
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 lg:grid-cols-2">
            <section className="flex min-h-0 flex-col border-r p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {request.all_locations && (
                  <select
                    className="min-w-52 flex-1 rounded-lg border px-3 py-2"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                  >
                    {scopes.map((scope) => (
                      <option key={scope.id} value={scope.location_id}>
                        {
                          locations.find(
                            (location) => location.id === scope.location_id,
                          )?.name
                        }{" "}
                        · {scope.status}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  className="rounded-lg border px-3 py-2"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="encontrado">Encontrados</option>
                  <option value="nao_encontrado">Não encontrados</option>
                </select>
                <select
                  className="rounded-lg border px-3 py-2"
                  value={assetStatusFilter}
                  onChange={(e) => setAssetStatusFilter(e.target.value)}
                >
                  <option value="todos">Todos os status</option>
                  <option value="disponivel">Disponível</option>
                  <option value="em_uso">Em uso</option>
                  <option value="em_manutencao">Em manutenção</option>
                  <option value="indisponivel">Indisponível</option>
                </select>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {loading ? (
                  <LoadingSpinner />
                ) : (
                  visibleItems.map((item) => {
                    const ok = found.has(item.equipment_id);
                    return (
                      <article
                        key={item.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 ${ok ? "border-emerald-300 bg-emerald-50" : "border-red-200 bg-red-50"}`}
                      >
                        {item.equipments?.image_url ? (
                          <img
                            src={item.equipments.image_url}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white">
                            <Barcode />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate">
                            {item.equipments?.name}
                          </strong>
                          <code className="text-xs">
                            {item.equipments?.patrimonial_code}
                          </code>
                        </div>
                        {ok ? (
                          <CheckCircle className="text-emerald-600" />
                        ) : (
                          <XCircle className="text-red-500" />
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
            <section className="flex min-h-0 flex-col p-4">
              <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode("typing")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ${mode === "typing" ? "bg-white shadow" : ""}`}
                >
                  <Keyboard size={17} /> Digitação
                </button>
                <button
                  type="button"
                  onClick={() => setMode("camera")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ${mode === "camera" ? "bg-white shadow" : ""}`}
                >
                  <Camera size={17} /> Código de barras
                </button>
              </div>
              {mode === "typing" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    registerCode(code);
                  }}
                  className="flex gap-2"
                >
                  <input
                    autoFocus
                    className="flex-1 rounded-xl border px-4 py-3 text-lg"
                    placeholder="Digite o número patrimonial"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <Button type="submit">Registrar</Button>
                </form>
              ) : (
                <div className="overflow-hidden rounded-2xl bg-black">
                  <video
                    ref={videoRef}
                    className="max-h-72 w-full object-cover"
                    muted
                    playsInline
                  />
                </div>
              )}
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                <h3 className="mb-2 font-semibold">
                  Itens encontrados nesta conferência
                </h3>
                {items
                  .filter((item) => found.has(item.equipment_id))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm"
                    >
                      <CheckCircle size={16} className="text-emerald-600" />
                      <strong>{item.equipments?.patrimonial_code}</strong>
                      <span className="truncate">{item.equipments?.name}</span>
                    </div>
                  ))}
              </div>
              {error && (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </section>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t bg-white p-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              disabled={busy || currentScope?.status === "concluido"}
              onClick={() => void save(false)}
            >
              <Save size={16} /> Salvar atual e concluir depois
            </Button>
            <Button
              disabled={busy || currentScope?.status === "concluido"}
              onClick={() => setConfirming(true)}
            >
              <ClipboardCheck size={16} /> Concluir inventário do ambiente
            </Button>
          </div>
        </div>
        {confirming && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save(true);
              }}
              className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold">Confirmar conclusão</h3>
              <p className="text-sm text-gray-600">
                Digite sua senha de acesso. Encontrados e não encontrados serão
                registrados na razão de cada patrimônio.
              </p>
              <input
                autoFocus
                required
                type="password"
                className="w-full rounded-lg border px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirming(false)}
                >
                  Voltar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Validando..." : "Confirmar conclusão"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function InventoryWorkflowDialog({
  open,
  onOpenChange,
  currentProfile,
  locations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile: Profile;
  locations: AssetLocation[];
}) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [executing, setExecuting] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    deadline: "",
    location_id: "",
    all_locations: false,
    responsible_profile_id: "",
  });
  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error: requestError }, { data: profileData }] =
      await Promise.all([
        supabase
          .from("inventory_requests")
          .select("*")
          .order("requested_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id,user_id,full_name,email,role")
          .eq("is_active", true)
          .order("full_name"),
      ]);
    if (requestError) setError(requestError.message);
    else {
      const list = (data ?? []) as Request[];
      const profileMap = new Map(
        (profileData ?? []).map((p) => [p.id, p.full_name || p.email]),
      );
      setRequests(
        list.map((r) => ({
          ...r,
          responsible_name: profileMap.get(r.responsible_profile_id),
          location_name:
            locations.find((l) => l.id === r.location_id)?.name ??
            "Todos os ambientes",
        })),
      );
    }
    setProfiles((profileData ?? []) as Profile[]);
    setLoading(false);
  }, [locations]);
  useEffect(() => {
    if (open) void load();
  }, [open, load]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("inventario");
    if (id && requests.length)
      setExecuting(requests.find((r) => r.id === id) ?? null);
  }, [requests]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const { error: createError } = await supabase.rpc(
      "create_inventory_request",
      {
        p_deadline: form.deadline,
        p_location_id: form.all_locations ? null : form.location_id,
        p_all_locations: form.all_locations,
        p_responsible_profile_id: form.responsible_profile_id,
      },
    );
    if (createError) setError(createError.message);
    else {
      setForm({
        deadline: "",
        location_id: "",
        all_locations: false,
        responsible_profile_id: "",
      });
      await load();
    }
  };
  return (
    <>
      <Dialog open={open && !executing} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="text-blue-600" /> Modo inventário
            </DialogTitle>
            <DialogDescription>
              Gere solicitações e acompanhe a fila de conferência patrimonial.
            </DialogDescription>
          </DialogHeader>
          {currentProfile.role === "administrador" && (
            <form
              onSubmit={create}
              className="grid gap-3 rounded-2xl border bg-blue-50 p-4 md:grid-cols-4"
            >
              <label>
                <span className="mb-1 block text-xs font-semibold">
                  Data limite *
                </span>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold">
                  Ambiente *
                </span>
                <select
                  required={!form.all_locations}
                  disabled={form.all_locations}
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.location_id}
                  onChange={(e) =>
                    setForm({ ...form, location_id: e.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {locations
                    .filter((l) => l.status === "ativo")
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
                <span className="mt-1 flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={form.all_locations}
                    onChange={(e) =>
                      setForm({ ...form, all_locations: e.target.checked })
                    }
                  />{" "}
                  Todos
                </span>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold">
                  Responsável *
                </span>
                <select
                  required
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.responsible_profile_id}
                  onChange={(e) =>
                    setForm({ ...form, responsible_profile_id: e.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} · {p.role}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Gerar solicitação
                </Button>
              </div>
            </form>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading ? (
            <div className="p-12 text-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_1fr_auto]"
                >
                  <div>
                    <strong className="text-blue-800">
                      {request.request_code}
                    </strong>
                    <p className="text-sm text-gray-600">
                      {request.location_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Solicitado em{" "}
                      {new Date(request.requested_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p>
                      Responsável: <strong>{request.responsible_name}</strong>
                    </p>
                    <p>
                      Prazo:{" "}
                      {new Date(
                        `${request.deadline}T12:00:00`,
                      ).toLocaleDateString("pt-BR")}{" "}
                      · {request.status}
                    </p>
                  </div>
                  <Button
                    disabled={
                      request.status === "concluido" ||
                      request.status === "cancelado"
                    }
                    onClick={() => setExecuting(request)}
                  >
                    Atender
                  </Button>
                </article>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {executing && (
        <InventoryExecution
          request={executing}
          locations={locations}
          profile={currentProfile}
          onClose={() => setExecuting(null)}
          onSaved={load}
        />
      )}
    </>
  );
}
