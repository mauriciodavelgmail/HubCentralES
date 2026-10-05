import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getEmailConfigurationError,
  sendTransactionalEmail,
} from "@/lib/email/server";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] as string,
  );
}

export async function POST(request: NextRequest) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  try {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (!token)
      return NextResponse.json(
        { error: "Sessão não informada." },
        { status: 401 },
      );
    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData.user)
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

    const { data: actor } = await db
      .from("profiles")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!actor)
      return NextResponse.json(
        { error: "Perfil não encontrado." },
        { status: 403 },
      );

    const [{ data: alerts, error: alertsError }, { data: recipients }] =
      await Promise.all([
        db
          .from("supply_alerts")
          .select("*, supplies(name,code,unit)")
          .eq("status", "pendente")
          .order("created_at")
          .limit(50),
        db
          .from("profiles")
          .select("email")
          .in("role", ["administrador", "administracao"])
          .eq("is_active", true),
      ]);
    if (alertsError) throw alertsError;

    const emails = [
      ...new Set((recipients ?? []).map((item) => item.email).filter(Boolean)),
    ];
    const configurationError = getEmailConfigurationError();
    let sent = 0;
    let failed = 0;

    for (const alert of alerts ?? []) {
      const failures: string[] = [];
      for (const email of emails) {
        try {
          if (configurationError) throw new Error(configurationError);
          const supply = alert.supplies as {
            name: string;
            code: string;
            unit: string;
          };
          const messageId = await sendTransactionalEmail({
            to: email,
            subject: `${alert.alert_level === "critico" ? "Estoque crítico" : "Estoque baixo"} — ${supply.name}`,
            idempotencyKey: `supply-alert-${alert.id}-${email}`,
            html: `<h2>${alert.alert_level === "critico" ? "Estoque crítico" : "Estoque baixo"}</h2><p>O insumo <strong>${escapeHtml(supply.name)}</strong> (${escapeHtml(supply.code)}) está com saldo de <strong>${alert.current_quantity} ${escapeHtml(supply.unit)}</strong>.</p><p>Estoque mínimo configurado: <strong>${alert.minimum_quantity}</strong>.</p>`,
          });
          await db.from("email_deliveries").insert({
            supply_id: alert.supply_id,
            supply_alert_id: alert.id,
            recipient_email: email,
            template: `supply_${alert.alert_level}`,
            status: "enviado",
            provider_message_id: messageId,
            sent_at: new Date().toISOString(),
          });
          sent += 1;
        } catch (sendError) {
          const message =
            sendError instanceof Error
              ? sendError.message
              : "Falha desconhecida";
          failures.push(`${email}: ${message}`);
          failed += 1;
          await db.from("email_deliveries").insert({
            supply_id: alert.supply_id,
            supply_alert_id: alert.id,
            recipient_email: email,
            template: `supply_${alert.alert_level}`,
            status: configurationError ? "ignorado" : "falhou",
            error_message: message,
          });
        }
      }
      await db
        .from("supply_alerts")
        .update({
          status:
            emails.length === 0 || failures.length === emails.length
              ? "falhou"
              : failures.length
                ? "parcial"
                : "enviado",
          error_message: failures.join(" | ") || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", alert.id);
    }
    return NextResponse.json({ alerts: alerts?.length ?? 0, sent, failed });
  } catch (error) {
    console.error("Erro ao enviar alertas de estoque:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível processar os alertas.",
      },
      { status: 500 },
    );
  }
}
