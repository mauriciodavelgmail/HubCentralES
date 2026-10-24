"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit,
  Image as ImageIcon,
  Plus,
  Search,
  Table2,
  Trash2,
  Users,
  ZoomIn,
  X,
} from "lucide-react";
import { MainLayout } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  LoadingSpinner,
} from "@/components/ui";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { useAuth } from "@/lib/auth/context";
import {
  createEvent,
  deleteEvent,
  Event,
  getEvents,
  updateEvent,
} from "@/lib/supabase/events";
import { supabase } from "@/lib/supabase/auth";
import { deleteFile, uploadImage } from "@/lib/supabase/storage";
import { ParticipantManager } from "@/components/events/ParticipantManager";

type ViewMode = "table" | "calendar";
type SortKey =
  "title" | "event_type" | "space" | "start_date" | "start_time" | "status";
type SortDirection = "asc" | "desc";

interface AgendaEvent extends Event {
  spaces?: { name: string } | null;
  thumbnail_url?: string | null;
  thumbnail_path?: string | null;
  audience_access?: "publico_fechado" | "aberto_publico" | null;
  activity_sector?: "sociedade_civil" | "governo" | null;
  facilitator_name?: string | null;
  facilitator_minibio?: string | null;
  facilitator_cnpj?: string | null;
  facilitator_cpf?: string | null;
  facilitator_phone?: string | null;
  facilitator_social?: string | null;
  facilitator_photo_url?: string | null;
  facilitator_photo_path?: string | null;
  organizer_name?: string | null;
  organizer_contact?: string | null;
  interpreter_needed?: boolean;
  equipments?: string[];
  materials_needed?: boolean;
  catering_needed?: boolean;
  furniture_change_needed?: boolean;
  public_registration_token?: string | null;
  public_registration_enabled?: boolean;
}

interface CalendarEvent {
  id: string;
  space_id: string;
  title: string;
  status: string;
  start_date: string;
  start_time: string;
  end_time: string;
}

interface AgendaSpace {
  id: string;
  name: string;
  capacity: number;
}

const EVENT_TYPES = [
  ["reuniao", "Reunião"],
  ["workshop", "Workshop"],
  ["palestra", "Palestra"],
  ["encontro", "Encontro"],
  ["outros", "Outros"],
] as const;
const EQUIPMENT_OPTIONS = [
  "Projetor",
  "Notebook",
  "Cabo HDMI",
  "TV",
  "Passador de Slides",
  "Microfone",
  "Caixa de Som",
  "Sem equipamentos",
];
const STATUS_LABELS: Record<string, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Reprovada/Cancelada",
};
const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500";

const EMPTY_FORM = {
  title: "",
  description: "",
  event_type: "reuniao",
  space_id: "",
  start_date: "",
  start_time: "",
  end_time: "",
  capacity: "",
  audience_access: "publico_fechado",
  activity_sector: "sociedade_civil",
  facilitator_name: "",
  facilitator_minibio: "",
  facilitator_cnpj: "",
  facilitator_cpf: "",
  facilitator_phone: "",
  facilitator_social: "",
  organizer_name: "",
  organizer_contact: "",
  interpreter_needed: "nao",
  equipments: [] as string[],
  materials_needed: "nao",
  catering_needed: "nao",
  furniture_change_needed: "nao",
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function startOfWeek(value: Date) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date;
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function isoWeekValue(value: Date) {
  const date = new Date(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
  );
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekStartFromValue(value: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(year, 0, 4);
  const januaryFourthDay = januaryFourth.getDay() || 7;
  const firstMonday = new Date(year, 0, 4 - januaryFourthDay + 1);
  firstMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
  return firstMonday;
}
function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [
      record.message,
      record.details,
      record.hint,
      record.code ? `Código: ${record.code}` : null,
    ].filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
    if (parts.length) return [...new Set(parts)].join(" — ");
    try {
      return JSON.stringify(error);
    } catch {
      return "Falha sem detalhes retornados pelo servidor.";
    }
  }
  return "Falha sem detalhes retornados pelo servidor.";
}

function validateImage(file: File | null, label: string) {
  if (!file) return "";
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  )
    return `${label}: use uma imagem JPG, PNG, WEBP ou GIF.`;
  if (file.size > 10 * 1024 * 1024)
    return `${label}: o arquivo deve ter no máximo 10 MB.`;
  return "";
}
function validCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1)
      sum += Number(cpf[index]) * (length + 1 - index);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
function validCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calculate = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce(
        (total, number, index) => total + Number(number) * weights[index],
        0,
      );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calculate(
    cnpj.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const second = calculate(
    cnpj.slice(0, 12) + first,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return cnpj.endsWith(`${first}${second}`);
}

export default function AgendaPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const canCreateEvent = [
    "administrador",
    "administracao",
    "visitante",
  ].includes(profile?.role ?? "");
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [spaces, setSpaces] = useState<AgendaSpace[]>([]);
  const [view, setView] = useState<ViewMode>("table");
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [saveErrorModal, setSaveErrorModal] = useState("");
  const [capacityError, setCapacityError] = useState("");
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "start_date",
    direction: "desc",
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [facilitatorPhoto, setFacilitatorPhoto] = useState<File | null>(null);
  const [participantEvent, setParticipantEvent] = useState<AgendaEvent | null>(
    null,
  );
  const [cancelEvent, setCancelEvent] = useState<AgendaEvent | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      setEvents((await getEvents()) as AgendaEvent[]);
      setError("");
    } catch (loadError) {
      setError(
        `Erro ao carregar eventos: ${loadError instanceof Error ? loadError.message : "erro desconhecido"}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
    void supabase
      .from("spaces")
      .select("id,name,capacity")
      .eq("status", "disponivel")
      .order("name")
      .then(({ data }) => {
        setSpaces((data ?? []) as AgendaSpace[]);
      });
  }, [loadEvents]);

  useEffect(() => {
    if (!events.length) return;
    const eventId = new URLSearchParams(window.location.search).get("evento");
    if (!eventId) return;
    const linkedEvent = events.find((event) => event.id === eventId);
    if (!linkedEvent) return;
    setView("table");
    setSearch(linkedEvent.title);
  }, [events]);

  useEffect(() => {
    if (view !== "calendar") return;
    const weekStart = startOfWeek(currentWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    setCalendarLoading(true);
    void supabase
      .rpc("get_weekly_space_calendar", {
        p_week_start: dateKey(weekStart),
        p_week_end: dateKey(weekEnd),
      })
      .then(({ data, error: calendarError }) => {
        if (calendarError) setError(calendarError.message);
        else setCalendarEvents((data ?? []) as CalendarEvent[]);
        setCalendarLoading(false);
      });
  }, [currentWeek, view]);

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events
      .filter(
        (event) =>
          (!query ||
            `${event.title} ${event.description ?? ""} ${event.spaces?.name ?? ""}`
              .toLowerCase()
              .includes(query)) &&
          (!filterStatus || event.status === filterStatus),
      )
      .sort((first, second) => {
        const values: Record<SortKey, [string, string]> = {
          title: [first.title, second.title],
          event_type: [first.event_type, second.event_type],
          space: [first.spaces?.name ?? "", second.spaces?.name ?? ""],
          start_date: [first.start_date, second.start_date],
          start_time: [first.start_time, second.start_time],
          status: [first.status, second.status],
        };
        const result = values[sort.key][0].localeCompare(
          values[sort.key][1],
          "pt-BR",
          { numeric: true },
        );
        return sort.direction === "asc" ? result : -result;
      });
  }, [events, filterStatus, search, sort]);

  const changeSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const SortHeader = ({
    field,
    children,
  }: {
    field: SortKey;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => changeSort(field)}
      className="flex items-center gap-1 font-semibold text-gray-700"
    >
      {children}
      {sort.key === field &&
        (sort.direction === "asc" ? (
          <ChevronUp size={14} />
        ) : (
          <ChevronDown size={14} />
        ))}
    </button>
  );

  const openForm = (
    event?: AgendaEvent,
    selectedDate?: string,
    selectedSpaceId?: string,
  ) => {
    setEditing(event ?? null);
    setThumbnail(null);
    setFacilitatorPhoto(null);
    setError("");
    setNotice("");
    setSaveErrorModal("");
    setCapacityError("");
    setForm(
      event
        ? {
            title: event.title,
            description: event.description ?? "",
            event_type: event.event_type,
            space_id: event.space_id,
            start_date: event.start_date,
            start_time: event.start_time.slice(0, 5),
            end_time: event.end_time.slice(0, 5),
            capacity: event.capacity?.toString() ?? "",
            audience_access: event.audience_access ?? "publico_fechado",
            activity_sector: event.activity_sector ?? "sociedade_civil",
            facilitator_name: event.facilitator_name ?? "",
            facilitator_minibio: event.facilitator_minibio ?? "",
            facilitator_cnpj: event.facilitator_cnpj ?? "",
            facilitator_cpf: event.facilitator_cpf ?? "",
            facilitator_phone: event.facilitator_phone ?? "",
            facilitator_social: event.facilitator_social ?? "",
            organizer_name: event.organizer_name ?? "",
            organizer_contact: event.organizer_contact ?? "",
            interpreter_needed: event.interpreter_needed ? "sim" : "nao",
            equipments: event.equipments ?? [],
            materials_needed: event.materials_needed ? "sim" : "nao",
            catering_needed: event.catering_needed ? "sim" : "nao",
            furniture_change_needed: event.furniture_change_needed
              ? "sim"
              : "nao",
          }
        : {
            ...EMPTY_FORM,
            start_date: selectedDate ?? "",
            space_id: selectedSpaceId ?? "",
          },
    );
    setShowDialog(true);
  };

  const notifyByEmail = async (eventId: string, action: string) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setNotice(
        "Evento salvo, mas a sessão expirou antes do envio dos e-mails.",
      );
      return;
    }
    try {
      const response = await fetch("/api/events/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ eventId, action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(
          `Evento salvo, mas houve erro no e-mail: ${payload.error ?? "falha não detalhada"}`,
        );
        return;
      }
      setNotice(
        `Evento salvo. ${payload.sent ?? 0} e-mail(s) enviado(s)${payload.failed ? ` e ${payload.failed} com falha` : ""}.`,
      );
    } catch (emailError) {
      setNotice(
        `Evento salvo, mas a API de e-mail não respondeu: ${errorMessage(emailError)}`,
      );
    }
  };

  const validateGuestCount = (
    value = form.capacity,
    spaceId = form.space_id,
  ) => {
    const space = spaces.find((item) => item.id === spaceId);
    const guestCount = Number(value);
    if (!Number.isInteger(guestCount) || guestCount < 1)
      return "Informe a quantidade de convidados do evento.";
    if (space && guestCount > space.capacity)
      return `A quantidade de convidados não pode ser superior à lotação do ambiente (${space.capacity} pessoas).`;
    return "";
  };

  const validateForm = () => {
    if (
      !form.title.trim() ||
      !form.space_id ||
      !form.start_date ||
      !form.start_time ||
      !form.end_time
    )
      return "Preencha título, ambiente, data e horários.";
    if (form.start_time >= form.end_time)
      return "O horário final deve ser posterior ao inicial.";
    const guestCountError = validateGuestCount();
    if (guestCountError) return guestCountError;
    if (
      !form.facilitator_name.trim() ||
      !validCpf(form.facilitator_cpf) ||
      !form.facilitator_phone.trim()
    )
      return "Preencha os dados obrigatórios da pessoa facilitadora e informe um CPF válido.";
    if (form.facilitator_cnpj && !validCnpj(form.facilitator_cnpj))
      return "Informe um CNPJ válido ou deixe o campo vazio.";
    if (!form.organizer_name.trim() || !form.organizer_contact.trim())
      return "Informe o nome e contato do organizador responsável.";
    if (!editing?.thumbnail_url && !thumbnail)
      return "Anexe a Imagem do Evento (Thumbnail).";
    const thumbnailError = validateImage(thumbnail, "Imagem do Evento");
    if (thumbnailError) return thumbnailError;
    const photoError = validateImage(
      facilitatorPhoto,
      "Foto da pessoa facilitadora",
    );
    if (photoError) return photoError;
    return "";
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateForm();
    if (validation) {
      setCapacityError(validateGuestCount());
      setSaveErrorModal(validation);
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    let uploadedThumbnailPath: string | null = null;
    let uploadedPhotoPath: string | null = null;
    try {
      let thumbnailUpload = null;
      let photoUpload = null;
      if (thumbnail) {
        try {
          thumbnailUpload = await uploadImage(thumbnail, "events/thumbnails");
          uploadedThumbnailPath = thumbnailUpload.path;
        } catch (uploadError) {
          throw new Error(
            `Falha no upload da Imagem do Evento: ${errorMessage(uploadError)}`,
          );
        }
      }
      if (facilitatorPhoto) {
        try {
          photoUpload = await uploadImage(
            facilitatorPhoto,
            "events/facilitators",
          );
          uploadedPhotoPath = photoUpload.path;
        } catch (uploadError) {
          throw new Error(
            `Falha no upload da foto da pessoa facilitadora: ${errorMessage(uploadError)}`,
          );
        }
      }
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        event_type: form.event_type,
        space_id: form.space_id,
        start_date: form.start_date,
        start_time: form.start_time,
        end_time: form.end_time,
        capacity: form.capacity ? Number(form.capacity) : null,
        audience_access: form.audience_access,
        activity_sector: form.activity_sector,
        facilitator_name: form.facilitator_name.trim(),
        facilitator_minibio: form.facilitator_minibio.trim() || null,
        facilitator_cnpj: onlyDigits(form.facilitator_cnpj) || null,
        facilitator_cpf: onlyDigits(form.facilitator_cpf),
        facilitator_phone: form.facilitator_phone.trim(),
        facilitator_social: form.facilitator_social.trim() || null,
        organizer_name: form.organizer_name.trim(),
        organizer_contact: form.organizer_contact.trim(),
        interpreter_needed: form.interpreter_needed === "sim",
        equipments: form.equipments,
        materials_needed: form.materials_needed === "sim",
        catering_needed: form.catering_needed === "sim",
        furniture_change_needed: form.furniture_change_needed === "sim",
        thumbnail_url: thumbnailUpload?.url ?? editing?.thumbnail_url ?? null,
        thumbnail_path:
          thumbnailUpload?.path ?? editing?.thumbnail_path ?? null,
        facilitator_photo_url:
          photoUpload?.url ?? editing?.facilitator_photo_url ?? null,
        facilitator_photo_path:
          photoUpload?.path ?? editing?.facilitator_photo_path ?? null,
        requester_id: editing?.requester_id ?? profile?.id,
        responsible_id: editing?.responsible_id ?? profile?.id,
        created_by: editing?.created_by ?? user?.id,
      };
      let saved: AgendaEvent;
      try {
        if (editing)
          saved = (await updateEvent(
            editing.id,
            payload as Partial<Event>,
          )) as AgendaEvent;
        else
          saved = (await createEvent({
            ...payload,
            status:
              profile?.role === "administrador"
                ? "confirmada"
                : "aguardando_aprovacao",
            approved_by: profile?.role === "administrador" ? profile.id : null,
            approved_at:
              profile?.role === "administrador"
                ? new Date().toISOString()
                : null,
          } as never)) as AgendaEvent;
      } catch (databaseError) {
        throw new Error(
          `Falha ao gravar o evento no banco: ${errorMessage(databaseError)}`,
        );
      }
      setShowDialog(false);
      await loadEvents();
      await notifyByEmail(saved.id, editing ? "updated" : "created");
    } catch (saveError) {
      console.error("Erro ao salvar evento:", saveError);
      if (uploadedThumbnailPath)
        await deleteFile("images", uploadedThumbnailPath).catch(
          (cleanupError) =>
            console.error("Falha ao remover thumbnail órfã:", cleanupError),
        );
      if (uploadedPhotoPath)
        await deleteFile("images", uploadedPhotoPath).catch((cleanupError) =>
          console.error("Falha ao remover foto órfã:", cleanupError),
        );
      setSaveErrorModal(`Erro ao salvar evento: ${errorMessage(saveError)}`);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (event: AgendaEvent, status: Event["status"]) => {
    try {
      const saved = await updateEvent(event.id, {
        status,
        approved_by: status === "confirmada" ? profile?.id : event.approved_by,
        approved_at:
          status === "confirmada"
            ? new Date().toISOString()
            : event.approved_at,
      });
      await loadEvents();
      await notifyByEmail(saved.id, `status-${status}`);
    } catch (statusError) {
      setError(
        `Erro ao alterar status: ${statusError instanceof Error ? statusError.message : "erro desconhecido"}`,
      );
    }
  };

  const remove = async (event: AgendaEvent) => {
    if (!window.confirm(`Excluir definitivamente o evento “${event.title}”?`))
      return;
    try {
      await deleteEvent(event.id);
      await loadEvents();
    } catch (deleteError) {
      setError(
        `Erro ao excluir evento: ${deleteError instanceof Error ? deleteError.message : "erro desconhecido"}`,
      );
    }
  };

  const cancelApprovedEvent = async () => {
    const reason = cancelReason.trim();
    if (!cancelEvent) return;
    if (reason.length < 5) {
      setCancelError("Informe um motivo com pelo menos 5 caracteres.");
      return;
    }

    setCancelling(true);
    setCancelError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token)
        throw new Error("Sua sessão expirou. Entre novamente no sistema.");

      const response = await fetch(
        "/api/events/" + cancelEvent.id + "/cancel",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + data.session.access_token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        sent?: number;
        failed?: number;
      };
      if (!response.ok)
        throw new Error(result.error || "Não foi possível cancelar o evento.");

      setCancelEvent(null);
      setCancelReason("");
      await loadEvents();
      setNotice(
        result.failed
          ? "Evento cancelado. " +
              (result.sent ?? 0) +
              " e-mail(s) enviado(s) e " +
              result.failed +
              " falharam."
          : "Evento cancelado e " +
              (result.sent ?? 0) +
              " e-mail(s) enviado(s).",
      );
    } catch (cancelFailure) {
      setCancelError(errorMessage(cancelFailure));
    } finally {
      setCancelling(false);
    }
  };

  const toggleEquipment = (equipment: string) =>
    setForm((current) => {
      if (equipment === "Sem equipamentos")
        return {
          ...current,
          equipments: current.equipments.includes(equipment) ? [] : [equipment],
        };
      const withoutNone = current.equipments.filter(
        (item) => item !== "Sem equipamentos",
      );
      return {
        ...current,
        equipments: withoutNone.includes(equipment)
          ? withoutNone.filter((item) => item !== equipment)
          : [...withoutNone, equipment],
      };
    });

  const weekStart = startOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const weekEnd = weekDays[6];
  const selectedSpace = spaces.find((space) => space.id === form.space_id);

  return (
    <ProtectedRoute
      allowedRoles={[
        "administrador",
        "administracao",
        "recepcao",
        "manutencao",
        "limpeza",
        "visitante",
      ]}
    >
      <MainLayout
        userName={profile?.full_name || "Usuário"}
        userRole={profile?.role || "visitante"}
        title="Agenda de Eventos"
        subtitle="Solicitações, aprovações e disponibilidade dos ambientes"
      >
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${view === "table" ? "bg-blue-600 text-white" : "text-gray-600"}`}
              >
                <Table2 size={18} />
                Tabela
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${view === "calendar" ? "bg-blue-600 text-white" : "text-gray-600"}`}
              >
                <CalendarDays size={18} />
                Calendário
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "administrador",
                "administracao",
                "recepcao",
                "visitante",
              ].includes(profile?.role ?? "") && (
                <Button
                  variant="outline"
                  onClick={() => router.push("/agenda/todos/dashboard")}
                >
                  <BarChart3 size={18} />
                  Dashboard geral
                </Button>
              )}
              {canCreateEvent && (
                <Button onClick={() => openForm()}>
                  <Plus size={19} />
                  Nova solicitação
                </Button>
              )}
            </div>
          </div>
          {error && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="shrink-0" size={20} />
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              {notice}
            </div>
          )}

          {view === "table" ? (
            <>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-2.5 text-gray-400"
                    size={20}
                  />
                  <input
                    className={`${inputClass} pl-10`}
                    placeholder="Pesquisar título, descrição ou ambiente"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <select
                  className={inputClass}
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                >
                  <option value="">Todos os status</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {loading ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !visibleEvents.length ? (
                <EmptyState
                  title="Nenhuma solicitação encontrada"
                  description="Crie uma solicitação ou ajuste os filtros."
                  action={
                    canCreateEvent ? (
                      <Button onClick={() => openForm()}>
                        <Plus size={18} />
                        Nova solicitação
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <Card>
                  <CardContent className="overflow-x-auto p-0">
                    <table className="w-full min-w-[980px] text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {(
                            [
                              ["title", "Título"],
                              ["event_type", "Tipo"],
                              ["space", "Ambiente"],
                              ["start_date", "Data"],
                              ["start_time", "Horário"],
                              ["status", "Status"],
                            ] as Array<[SortKey, string]>
                          ).map(([field, label]) => (
                            <th key={field} className="px-4 py-3 text-left">
                              <SortHeader field={field}>{label}</SortHeader>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleEvents.map((agendaEvent) => (
                          <tr
                            key={agendaEvent.id}
                            className="border-t border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {agendaEvent.thumbnail_url ? (
                                  <button
                                    type="button"
                                    title="Ampliar imagem do evento"
                                    aria-label={
                                      "Ampliar imagem de " + agendaEvent.title
                                    }
                                    className="group relative h-10 w-14 shrink-0 overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onClick={() =>
                                      setImagePreview({
                                        url: agendaEvent.thumbnail_url!,
                                        alt:
                                          "Imagem do evento " +
                                          agendaEvent.title,
                                      })
                                    }
                                  >
                                    <img
                                      src={agendaEvent.thumbnail_url}
                                      alt=""
                                      className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/45 group-hover:opacity-100">
                                      <ZoomIn size={16} />
                                    </span>
                                  </button>
                                ) : (
                                  <div className="flex h-10 w-14 items-center justify-center rounded bg-gray-100">
                                    <ImageIcon size={18} />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {agendaEvent.title}
                                  </p>
                                  <p className="max-w-56 truncate text-xs text-gray-500">
                                    {agendaEvent.description}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {EVENT_TYPES.find(
                                ([value]) => value === agendaEvent.event_type,
                              )?.[1] ?? agendaEvent.event_type}
                            </td>
                            <td className="px-4 py-3">
                              {agendaEvent.spaces?.name ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              {new Date(
                                `${agendaEvent.start_date}T12:00:00`,
                              ).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-4 py-3">
                              {agendaEvent.start_time.slice(0, 5)}–
                              {agendaEvent.end_time.slice(0, 5)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  agendaEvent.status === "confirmada" ||
                                  agendaEvent.status === "realizada"
                                    ? "success"
                                    : agendaEvent.status ===
                                        "aguardando_aprovacao"
                                      ? "warning"
                                      : "danger"
                                }
                              >
                                {STATUS_LABELS[agendaEvent.status] ??
                                  agendaEvent.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                {(["confirmada", "realizada"].includes(
                                  agendaEvent.status,
                                ) &&
                                  ([
                                    "administrador",
                                    "administracao",
                                    "recepcao",
                                  ].includes(profile?.role ?? "") ||
                                    agendaEvent.requester_id === profile?.id)) && (
                                  <Button
                                    title="Dashboard de participantes"
                                    variant="ghost"
                                    size="sm"
                                    className="text-purple-700"
                                    onClick={() =>
                                      router.push(
                                        `/agenda/${agendaEvent.id}/dashboard`,
                                      )
                                    }
                                  >
                                    <BarChart3 size={17} />
                                  </Button>
                                )}
                                {agendaEvent.status === "confirmada" && (
                                  <Button
                                    title="Vincular participantes"
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-700"
                                    onClick={() =>
                                      setParticipantEvent(agendaEvent)
                                    }
                                  >
                                    <Users size={17} />
                                  </Button>
                                )}
                                {agendaEvent.status === "confirmada" &&
                                  (profile?.role === "administrador" ||
                                    agendaEvent.requester_id ===
                                      profile?.id) && (
                                    <Button
                                      title="Cancelar Evento"
                                      variant="danger"
                                      size="sm"
                                      className="gap-1 whitespace-nowrap"
                                      onClick={() => {
                                        setCancelEvent(agendaEvent);
                                        setCancelReason("");
                                        setCancelError("");
                                      }}
                                    >
                                      <Ban size={16} />
                                      Cancelar Evento
                                    </Button>
                                  )}
                                {profile?.role === "administrador" &&
                                  agendaEvent.status ===
                                    "aguardando_aprovacao" && (
                                    <>
                                      <Button
                                        title="Aprovar"
                                        variant="ghost"
                                        size="sm"
                                        className="text-green-700"
                                        onClick={() =>
                                          void changeStatus(
                                            agendaEvent,
                                            "confirmada",
                                          )
                                        }
                                      >
                                        <Check size={17} />
                                      </Button>
                                      <Button
                                        title="Reprovar"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-700"
                                        onClick={() =>
                                          void changeStatus(
                                            agendaEvent,
                                            "cancelada",
                                          )
                                        }
                                      >
                                        <X size={17} />
                                      </Button>
                                    </>
                                  )}{" "}
                                {profile?.role === "administrador" && (
                                  <>
                                    <Button
                                      title="Editar"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openForm(agendaEvent)}
                                    >
                                      <Edit size={17} />
                                    </Button>
                                    <Button
                                      title="Excluir"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-700"
                                      onClick={() => void remove(agendaEvent)}
                                    >
                                      <Trash2 size={17} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Semana anterior"
                  onClick={() => {
                    const previous = new Date(weekStart);
                    previous.setDate(previous.getDate() - 7);
                    setCurrentWeek(previous);
                  }}
                >
                  <ChevronLeft size={20} />
                </Button>
                <div className="text-center">
                  <CardTitle>Disponibilidade semanal</CardTitle>
                  <p className="mt-1 text-sm text-gray-500">
                    {weekStart.toLocaleDateString("pt-BR")} a{" "}
                    {weekEnd.toLocaleDateString("pt-BR")}
                  </p>
                  <label className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-gray-600">
                    Ir para semana
                    <input
                      type="week"
                      aria-label="Selecionar semana do calendário"
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                      value={isoWeekValue(weekStart)}
                      onChange={(event) => {
                        const selectedWeek = weekStartFromValue(
                          event.target.value,
                        );
                        if (selectedWeek) setCurrentWeek(selectedWeek);
                      }}
                    />
                  </label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Próxima semana"
                  onClick={() => {
                    const next = new Date(weekStart);
                    next.setDate(next.getDate() + 7);
                    setCurrentWeek(next);
                  }}
                >
                  <ChevronRight size={20} />
                </Button>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                {calendarLoading ? (
                  <div className="flex justify-center py-20">
                    <LoadingSpinner />
                  </div>
                ) : !spaces.length ? (
                  <EmptyState
                    title="Nenhum ambiente disponível"
                    description="Cadastre ou ative um ambiente nas configurações."
                  />
                ) : (
                  <div className="overscroll-x-contain overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[700px] table-fixed text-xs sm:min-w-[1050px] sm:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="sticky left-0 z-10 w-24 border-r border-gray-200 bg-gray-50 px-1.5 py-2 text-left sm:w-52 sm:px-3 sm:py-3">
                            Ambiente
                          </th>
                          {weekDays.map((day) => (
                            <th
                              key={dateKey(day)}
                              className="px-1 py-2 text-center sm:px-2 sm:py-3"
                            >
                              <span className="block capitalize">
                                {day.toLocaleDateString("pt-BR", {
                                  weekday: "short",
                                })}
                              </span>
                              <span className="text-[10px] font-normal text-gray-500 sm:text-xs">
                                {day.toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {spaces.map((space) => (
                          <tr key={space.id} className="border-t border-gray-200">
                            <th className="sticky left-0 z-10 border-r border-gray-200 bg-white px-1.5 py-2 text-left align-top sm:px-3 sm:py-3">
                              <span className="block break-words text-[11px] font-semibold leading-tight text-gray-900 sm:text-sm sm:leading-normal">
                                {space.name}
                              </span>
                              <span className="mt-1 block text-[9px] font-normal text-gray-500 sm:text-xs">
                                <span className="sm:hidden">{space.capacity} lugares</span>
                                <span className="hidden sm:inline">
                                  Lotação: {space.capacity} pessoas
                                </span>
                              </span>
                            </th>
                            {weekDays.map((day) => {
                              const date = dateKey(day);
                              const dayEvents = calendarEvents.filter(
                                (item) =>
                                  item.space_id === space.id &&
                                  item.start_date === date,
                              );
                              const isPast = date < dateKey(new Date());
                              const unavailable = isPast || dayEvents.length > 0;
                              return (
                                <td
                                  key={`${space.id}-${date}`}
                                  className="p-0.5 align-top sm:p-1"
                                >
                                  <button
                                    type="button"
                                    disabled={unavailable || !canCreateEvent}
                                    onClick={() =>
                                      openForm(undefined, date, space.id)
                                    }
                                    className={`min-h-16 w-full rounded-md border p-1 text-left transition-colors sm:min-h-24 sm:p-2 ${unavailable ? "cursor-not-allowed border-red-200 bg-red-50" : canCreateEvent ? "border-green-200 bg-green-50 hover:border-green-400 hover:bg-green-100" : "cursor-default border-green-200 bg-green-50"}`}
                                  >
                                    <span
                                      className={`text-[10px] font-semibold sm:text-xs ${unavailable ? "text-red-700" : "text-green-700"}`}
                                    >
                                      <span className="sm:hidden">
                                        {unavailable ? "Ocupado" : "Livre"}
                                      </span>
                                      <span className="hidden sm:inline">
                                        {unavailable ? "Indisponível" : "Disponível"}
                                      </span>
                                    </span>
                                    {dayEvents.map((calendarEvent) => (
                                      <span
                                        key={calendarEvent.id}
                                        className="mt-1 block text-[9px] leading-tight text-red-800 sm:text-[11px]"
                                      >
                                        <strong className="hidden truncate sm:block">
                                          {calendarEvent.title}
                                        </strong>
                                        {calendarEvent.start_time.slice(0, 5)}–
                                        {calendarEvent.end_time.slice(0, 5)}
                                      </span>
                                    ))}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Editar evento" : "Solicitar evento"}
                </DialogTitle>
                <DialogDescription>
                  O status é definido automaticamente: eventos criados pelo
                  Administrador são confirmados; demais solicitações aguardam
                  aprovação.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} noValidate className="space-y-6">
                <section className="space-y-4">
                  <h3 className="border-b pb-2 text-lg font-semibold">
                    Dados do evento
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Título *">
                      <input
                        required
                        className={inputClass}
                        value={form.title}
                        onChange={(event) =>
                          setForm({ ...form, title: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Tipo do evento *">
                      <select
                        className={inputClass}
                        value={form.event_type}
                        onChange={(event) =>
                          setForm({ ...form, event_type: event.target.value })
                        }
                      >
                        {EVENT_TYPES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Descrição">
                    <textarea
                      rows={3}
                      className={inputClass}
                      value={form.description}
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Imagem do Evento (Thumbnail) *"
                    hint="Envie JPG, PNG, WEBP ou GIF de até 10 MB."
                  >
                    <input
                      type="file"
                      accept="image/*"
                      required={!editing?.thumbnail_url}
                      onChange={(event) =>
                        setThumbnail(event.target.files?.[0] ?? null)
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RadioGroup
                      label="Acesso ao evento *"
                      value={form.audience_access}
                      options={[
                        ["publico_fechado", "Público fechado"],
                        ["aberto_publico", "Aberto ao público"],
                      ]}
                      onChange={(value) =>
                        setForm({ ...form, audience_access: value })
                      }
                    />
                    <RadioGroup
                      label="Tipo de atividade *"
                      value={form.activity_sector}
                      options={[
                        ["sociedade_civil", "Sociedade civil"],
                        ["governo", "Governo"],
                      ]}
                      onChange={(value) =>
                        setForm({ ...form, activity_sector: value })
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Ambiente *">
                      <select
                        required
                        className={inputClass}
                        value={form.space_id}
                        onChange={(event) => {
                          setForm({ ...form, space_id: event.target.value });
                          setCapacityError("");
                        }}
                      >
                        <option value="">Selecione</option>
                        {spaces.map((space) => (
                          <option key={space.id} value={space.id}>
                            {space.name} (até {space.capacity} pessoas)
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Data *">
                      <input
                        required
                        type="date"
                        className={inputClass}
                        value={form.start_date}
                        onChange={(event) =>
                          setForm({ ...form, start_date: event.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label="Quantidade de convidados *"
                      hint={
                        selectedSpace
                          ? `Lotação máxima do ambiente: ${selectedSpace.capacity} pessoas.`
                          : "Selecione um ambiente para consultar a lotação máxima."
                      }
                    >
                      <input
                        required
                        min="1"
                        max={selectedSpace?.capacity}
                        type="number"
                        aria-invalid={Boolean(capacityError)}
                        className={`${inputClass} ${capacityError ? "border-red-500 focus:ring-red-500" : ""}`}
                        value={form.capacity}
                        onChange={(event) => {
                          setForm({ ...form, capacity: event.target.value });
                          setCapacityError("");
                        }}
                        onBlur={(event) =>
                          setCapacityError(validateGuestCount(event.target.value))
                        }
                      />
                      {capacityError && (
                        <span className="mt-1 block text-xs font-medium text-red-600">
                          {capacityError}
                        </span>
                      )}
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Horário inicial *">
                      <input
                        required
                        type="time"
                        className={inputClass}
                        value={form.start_time}
                        onChange={(event) =>
                          setForm({ ...form, start_time: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Horário final *">
                      <input
                        required
                        type="time"
                        className={inputClass}
                        value={form.end_time}
                        onChange={(event) =>
                          setForm({ ...form, end_time: event.target.value })
                        }
                      />
                    </Field>
                  </div>
                </section>
                <section className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Informações Gerais
                    </h3>
                    <h4 className="font-medium text-blue-700">
                      Pessoa facilitadora
                    </h4>
                    <p className="text-sm text-gray-600">
                      Informe os dados da pessoa responsável por conduzir a
                      atividade. Eles serão utilizados pela equipe para
                      organização e contato.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nome completo *">
                      <input
                        required
                        className={inputClass}
                        value={form.facilitator_name}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            facilitator_name: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="CPF *">
                      <input
                        required
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        className={inputClass}
                        value={form.facilitator_cpf}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            facilitator_cpf: event.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Minibio (opcional)">
                    <textarea
                      rows={3}
                      className={inputClass}
                      value={form.facilitator_minibio}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          facilitator_minibio: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="CNPJ (opcional)">
                      <input
                        inputMode="numeric"
                        placeholder="00.000.000/0000-00"
                        className={inputClass}
                        value={form.facilitator_cnpj}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            facilitator_cnpj: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Telefone de contato *">
                      <input
                        required
                        type="tel"
                        className={inputClass}
                        value={form.facilitator_phone}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            facilitator_phone: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Perfil de rede social (opcional)">
                      <input
                        placeholder="@perfil ou URL"
                        className={inputClass}
                        value={form.facilitator_social}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            facilitator_social: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field
                      label="Foto (opcional)"
                      hint="Escolha uma imagem ou use a câmera do celular."
                    >
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) =>
                          setFacilitatorPhoto(event.target.files?.[0] ?? null)
                        }
                      />
                    </Field>
                    <Field label="Nome do organizador responsável *">
                      <input
                        required
                        className={inputClass}
                        value={form.organizer_name}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            organizer_name: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Contato do organizador *">
                      <input
                        required
                        className={inputClass}
                        value={form.organizer_contact}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            organizer_contact: event.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="border-b pb-2 text-lg font-semibold">
                    Necessidades da atividade
                  </h3>
                  <RadioGroup
                    label="Necessidade de intérprete *"
                    value={form.interpreter_needed}
                    options={[
                      ["sim", "Sim"],
                      ["nao", "Não"],
                    ]}
                    onChange={(value) =>
                      setForm({ ...form, interpreter_needed: value })
                    }
                  />
                  <Field label="Equipamentos">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {EQUIPMENT_OPTIONS.map((equipment) => (
                        <label
                          key={equipment}
                          className="flex items-center gap-2 rounded border p-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={form.equipments.includes(equipment)}
                            onChange={() => toggleEquipment(equipment)}
                          />
                          {equipment}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <RadioGroup
                      label="Materiais *"
                      value={form.materials_needed}
                      options={[
                        ["sim", "Sim"],
                        ["nao", "Não"],
                      ]}
                      onChange={(value) =>
                        setForm({ ...form, materials_needed: value })
                      }
                    />
                    <RadioGroup
                      label="Catering *"
                      value={form.catering_needed}
                      options={[
                        ["sim", "Sim"],
                        ["nao", "Não"],
                      ]}
                      onChange={(value) =>
                        setForm({ ...form, catering_needed: value })
                      }
                    />
                    <RadioGroup
                      label="Mudança de mobília *"
                      value={form.furniture_change_needed}
                      options={[
                        ["sim", "Sim"],
                        ["nao", "Não"],
                      ]}
                      onChange={(value) =>
                        setForm({ ...form, furniture_change_needed: value })
                      }
                    />
                  </div>
                </section>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={saving}>
                    {editing ? "Salvar alterações" : "Enviar solicitação"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={Boolean(saveErrorModal)}
            onOpenChange={(open) => {
              if (!open) setSaveErrorModal("");
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-700" />
                </div>
                <DialogTitle>Não foi possível salvar a solicitação</DialogTitle>
                <DialogDescription className="mt-2 leading-6 text-red-700">
                  {saveErrorModal}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" onClick={() => setSaveErrorModal("")}>
                  Corrigir dados
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={Boolean(cancelEvent)}
            onOpenChange={(open) => {
              if (!open && !cancelling) {
                setCancelEvent(null);
                setCancelReason("");
                setCancelError("");
              }
            }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-700">
                  <Ban size={21} /> Cancelar evento
                </DialogTitle>
                <DialogDescription>
                  Esta ação bloqueará o evento e notificará o administrador, a
                  recepção e o responsável pelo evento por e-mail.
                </DialogDescription>
              </DialogHeader>
              {cancelEvent && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="font-semibold text-gray-900">
                    {cancelEvent.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {new Date(
                      cancelEvent.start_date + "T12:00:00",
                    ).toLocaleDateString("pt-BR")}{" "}
                    às {cancelEvent.start_time.slice(0, 5)}
                  </p>
                </div>
              )}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Motivo do cancelamento *
                </span>
                <textarea
                  autoFocus
                  rows={4}
                  value={cancelReason}
                  disabled={cancelling}
                  onChange={(event) => {
                    setCancelReason(event.target.value);
                    setCancelError("");
                  }}
                  placeholder="Explique o motivo do cancelamento"
                  className={inputClass}
                />
              </label>
              {cancelError && (
                <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 shrink-0" size={17} />
                  <span>{cancelError}</span>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={cancelling}
                  onClick={() => setCancelEvent(null)}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  loading={cancelling}
                  disabled={cancelReason.trim().length < 5}
                  onClick={() => void cancelApprovedEvent()}
                >
                  Confirmar cancelamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={Boolean(imagePreview)}
            onOpenChange={(open) => !open && setImagePreview(null)}
          >
            <DialogContent className="max-w-5xl bg-gray-950 p-3">
              <DialogHeader className="sr-only">
                <DialogTitle>Imagem ampliada do evento</DialogTitle>
                <DialogDescription>
                  Visualização ampliada da imagem do evento.
                </DialogDescription>
              </DialogHeader>
              {imagePreview && (
                <img
                  src={imagePreview.url}
                  alt={imagePreview.alt}
                  className="max-h-[80vh] w-full rounded-lg object-contain"
                />
              )}
            </DialogContent>
          </Dialog>
          {participantEvent && (
            <ParticipantManager
              event={participantEvent}
              open={true}
              onClose={() => {
                setParticipantEvent(null);
                void loadEvents();
              }}
            />
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {hint && <span className="mb-2 block text-xs text-gray-500">{hint}</span>}
      {children}
    </label>
  );
}
function RadioGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-gray-700">
        {label}
      </legend>
      <div className="flex flex-wrap gap-4">
        {options.map(([optionValue, optionLabel]) => (
          <label key={optionValue} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            {optionLabel}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
