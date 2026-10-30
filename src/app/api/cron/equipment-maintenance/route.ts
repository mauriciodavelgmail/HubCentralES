import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getEmailConfigurationError,
  sendTransactionalEmail,
} from "@/lib/email/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function saoPauloToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] as string,
  );
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
  const today = saoPauloToday();

  try {
    const { data: processed, error: processError } = await db.rpc(
      "process_equipment_maintenance_alerts",
      { p_today: today },
    );
    if (processError) throw processError;
    const alertIds = (processed ?? []).map(
      (item: { alert_id: string }) => item.alert_id,
    );
    if (!alertIds.length)
      return NextResponse.json({ date: today, alerts: 0, sent: 0, failed: 0 });

    const [
      { data: alerts, error: alertsError },
      { data: admins, error: adminsError },
    ] = await Promise.all([
      db
        .from("equipment_maintenance_alerts")
        .select(
          "id,alert_type,maintenance_date,equipment:equipments(id,name,patrimonial_code)",
        )
        .in("id", alertIds),
      db
        .from("profiles")
        .select("email,full_name")
        .eq("role", "administrador")
        .eq("is_active", true),
    ]);
    if (alertsError) throw alertsError;
    if (adminsError) throw adminsError;

    const configurationError = getEmailConfigurationError();
    let sent = 0;
    let failed = 0;
    for (const alert of alerts ?? []) {
      const equipment = alert.equipment as unknown as {
        id: string;
        name: string;
        patrimonial_code: string;
      } | null;
      if (!equipment) continue;
      for (const admin of admins ?? []) {
        if (!admin.email) continue;
        const { data: existing } = await db
          .from("equipment_maintenance_email_deliveries")
          .select("status")
          .eq("alert_id", alert.id)
          .eq("recipient_email", admin.email)
          .maybeSingle();
        if (existing?.status === "enviado") continue;
        try {
          if (configurationError) throw new Error(configurationError);
          const dueToday = alert.alert_type === "due_today";
          const messageId = await sendTransactionalEmail({
            to: admin.email,
            subject: dueToday
              ? `Manutenção vence hoje — ${equipment.name}`
              : `Manutenção em 7 dias — ${equipment.name}`,
            idempotencyKey: `equipment-maintenance-${alert.id}-${admin.email}`,
            html: `<h2>${dueToday ? "Manutenção vence hoje" : "Manutenção programada em 7 dias"}</h2><p>Olá, ${escapeHtml(admin.full_name || "Administrador")}.</p><p><strong>Equipamento:</strong> ${escapeHtml(equipment.name)}<br><strong>Patrimônio:</strong> ${escapeHtml(equipment.patrimonial_code)}<br><strong>Data:</strong> ${new Date(`${alert.maintenance_date}T12:00:00`).toLocaleDateString("pt-BR")}</p><p><a href="${request.nextUrl.origin}/equipamentos?patrimonio=${equipment.id}">Abrir equipamento</a></p>`,
          });
          await db.from("equipment_maintenance_email_deliveries").upsert(
            {
              alert_id: alert.id,
              recipient_email: admin.email,
              status: "enviado",
              provider_message_id: messageId,
              error_message: null,
              sent_at: new Date().toISOString(),
            },
            { onConflict: "alert_id,recipient_email" },
          );
          sent += 1;
        } catch (emailError) {
          await db.from("equipment_maintenance_email_deliveries").upsert(
            {
              alert_id: alert.id,
              recipient_email: admin.email,
              status: configurationError ? "ignorado" : "falhou",
              error_message:
                emailError instanceof Error
                  ? emailError.message
                  : "Erro desconhecido",
            },
            { onConflict: "alert_id,recipient_email" },
          );
          failed += 1;
        }
      }
    }
    return NextResponse.json({
      date: today,
      alerts: alerts?.length ?? 0,
      sent,
      failed,
    });
  } catch (error) {
    console.error("Erro nos alertas de manutenção:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
