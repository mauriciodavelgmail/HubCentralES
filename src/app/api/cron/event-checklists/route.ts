import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getEmailConfigurationError,
  sendTransactionalEmail,
} from "@/lib/email/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TARGET_ROLES = [
  "administrador",
  "administracao",
  "manutencao",
  "limpeza",
];
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

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] as string,
  );
}

function saoPauloDateAfter(days: number) {
  const date = new Date(Date.now() + days * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function yesNo(value: boolean) {
  return value ? "☒ Sim  ☐ Não" : "☐ Sim  ☒ Não";
}

function buildSolution(event: {
  interpreter_needed: boolean;
  equipments: string[] | null;
  materials_needed: boolean;
  catering_needed: boolean;
  furniture_change_needed: boolean;
}) {
  const selected = new Set(event.equipments ?? []);
  return [
    "Necessidade de intérprete *",
    yesNo(event.interpreter_needed),
    "",
    "Equipamentos",
    EQUIPMENT_OPTIONS.map(
      (item) => `${selected.has(item) ? "☒" : "☐"} ${item}`,
    ).join("\n"),
    "",
    "Materiais *",
    yesNo(event.materials_needed),
    "",
    "Catering *",
    yesNo(event.catering_needed),
    "",
    "Mudança de mobília *",
    yesNo(event.furniture_change_needed),
  ].join("\n");
}

function siteUrl(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const targetDate = saoPauloDateAfter(1);

  try {
    const [
      { data: events, error: eventsError },
      { data: recipients, error: recipientsError },
    ] = await Promise.all([
      db
        .from("events")
        .select(
          "id,title,start_date,start_time,end_time,space_id,requester_id,interpreter_needed,equipments,materials_needed,catering_needed,furniture_change_needed,spaces(name),requester:profiles!requester_id(user_id)",
        )
        .eq("status", "confirmada")
        .eq("start_date", targetDate),
      db
        .from("profiles")
        .select("user_id,email,full_name,role")
        .in("role", TARGET_ROLES)
        .eq("is_active", true)
        .not("user_id", "is", null),
    ]);
    if (eventsError) throw eventsError;
    if (recipientsError) throw recipientsError;

    const configurationError = getEmailConfigurationError();
    let created = 0;
    let existing = 0;
    let sent = 0;
    let failed = 0;

    for (const event of events ?? []) {
      const space = event.spaces as unknown as { name: string } | null;
      const requester = event.requester as unknown as {
        user_id: string | null;
      } | null;
      const eventPath = `/agenda?evento=${event.id}`;
      const dateLabel = new Date(
        `${event.start_date}T12:00:00`,
      ).toLocaleDateString("pt-BR");
      const timeLabel = `${String(event.start_time).slice(0, 5)}–${String(event.end_time).slice(0, 5)}`;
      const description = `[${event.title}](${eventPath}) — ${dateLabel}, ${timeLabel}, ${space?.name ?? "Local não informado"}\nCheck-list: verificar as Necessidades da atividade antes do início do evento.`;

      let { data: occurrence } = await db
        .from("occurrences")
        .select("id")
        .eq("event_id", event.id)
        .eq("is_automatic_event_checklist", true)
        .maybeSingle();

      if (!occurrence) {
        const identifier = event.id
          .replaceAll("-", "")
          .slice(0, 12)
          .toUpperCase();
        const { data: inserted, error: insertError } = await db
          .from("occurrences")
          .insert({
            occurrence_number: `CHK-${event.start_date.replaceAll("-", "")}-${identifier}`,
            title: `Check-list + ${event.title}`,
            description,
            category: "checklist_evento",
            priority: "alta",
            status: "aberta",
            location: space?.name ?? "Local não informado",
            reporter_id: event.requester_id,
            solution: buildSolution(event),
            occurred_at: saoPauloDateAfter(0),
            deadline: event.start_date,
            event_id: event.id,
            space_id: event.space_id,
            is_automatic_event_checklist: true,
            created_by: requester?.user_id ?? null,
          })
          .select("id")
          .single();
        if (insertError) {
          if (insertError.code !== "23505") throw insertError;
          const retry = await db
            .from("occurrences")
            .select("id")
            .eq("event_id", event.id)
            .eq("is_automatic_event_checklist", true)
            .single();
          if (retry.error) throw retry.error;
          occurrence = retry.data;
          existing += 1;
        } else {
          occurrence = inserted;
          created += 1;
        }
      } else {
        existing += 1;
      }

      const emails = [
        ...new Set(
          (recipients ?? []).map((profile) => profile.email).filter(Boolean),
        ),
      ];
      const { data: delivered } = await db
        .from("email_deliveries")
        .select("recipient_email")
        .eq("occurrence_id", occurrence.id)
        .eq("template", "event_checklist")
        .eq("status", "enviado");
      const alreadySent = new Set(
        (delivered ?? []).map((item) => item.recipient_email),
      );

      for (const email of emails) {
        if (alreadySent.has(email)) continue;
        try {
          if (configurationError) throw new Error(configurationError);
          const messageId = await sendTransactionalEmail({
            to: email,
            subject: `Check-list do evento — ${event.title}`,
            idempotencyKey: `event-checklist-${occurrence.id}-${email}`,
            html: `<h2>Check-list de evento</h2><p>Uma ocorrência foi aberta para verificar materiais, manutenção e limpeza do evento.</p><p><strong>Evento:</strong> <a href="${siteUrl(request)}${eventPath}">${escapeHtml(event.title)}</a><br><strong>Data e horário:</strong> ${dateLabel}, ${timeLabel}<br><strong>Local:</strong> ${escapeHtml(space?.name ?? "Local não informado")}</p><p><a href="${siteUrl(request)}/ocorrencias?ocorrencia=${occurrence.id}">Abrir ocorrência e conferir necessidades</a></p>`,
          });
          await db.from("email_deliveries").insert({
            event_id: event.id,
            occurrence_id: occurrence.id,
            recipient_email: email,
            template: "event_checklist",
            status: "enviado",
            provider_message_id: messageId,
            sent_at: new Date().toISOString(),
          });
          sent += 1;
        } catch (emailError) {
          await db.from("email_deliveries").insert({
            event_id: event.id,
            occurrence_id: occurrence.id,
            recipient_email: email,
            template: "event_checklist",
            status: configurationError ? "ignorado" : "falhou",
            error_message:
              emailError instanceof Error
                ? emailError.message
                : "Falha desconhecida",
          });
          failed += 1;
        }
      }
    }

    return NextResponse.json({
      targetDate,
      events: events?.length ?? 0,
      created,
      existing,
      sent,
      failed,
    });
  } catch (error) {
    console.error("Erro ao gerar check-lists de eventos:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
