import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getEmailConfigurationError,
  sendTransactionalEmail,
} from "@/lib/email/server";

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const db = client();
  try {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (!token)
      return NextResponse.json(
        { error: "Sessão não informada." },
        { status: 401 },
      );
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user)
      return NextResponse.json(
        { error: "Sessão inválida ou expirada." },
        { status: 401 },
      );
    const { id } = await context.params;
    const body = await request.json();
    const reason = String(body.reason || "").trim();
    if (reason.length < 5)
      return NextResponse.json(
        {
          error:
            "Informe um motivo de cancelamento com pelo menos 5 caracteres.",
        },
        { status: 400 },
      );

    const [{ data: actor }, { data: event }] = await Promise.all([
      db
        .from("profiles")
        .select("id,role,email,full_name")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single(),
      db
        .from("events")
        .select("id,title,status,start_date,start_time,requester_id")
        .eq("id", id)
        .single(),
    ]);
    if (!actor || !event)
      return NextResponse.json(
        { error: "Perfil ou evento não encontrado." },
        { status: 404 },
      );
    if (actor.role !== "administrador" && actor.id !== event.requester_id)
      return NextResponse.json(
        {
          error:
            "Somente o Administrador ou o criador podem cancelar este evento.",
        },
        { status: 403 },
      );
    if (event.status !== "confirmada")
      return NextResponse.json(
        { error: "Somente eventos aprovados podem ser cancelados." },
        { status: 409 },
      );

    const cancelledAt = new Date().toISOString();
    const { data: cancelled, error: updateError } = await db
      .from("events")
      .update({
        status: "cancelada",
        rejection_reason: reason,
        cancellation_reason: reason,
        cancelled_at: cancelledAt,
        cancelled_by: actor.id,
        updated_by: user.id,
      })
      .eq("id", id)
      .eq("status", "confirmada")
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!cancelled)
      return NextResponse.json(
        { error: "O evento já foi alterado e não pode mais ser cancelado." },
        { status: 409 },
      );

    const { data: recipients } = await db
      .from("profiles")
      .select("email,id")
      .eq("is_active", true)
      .or(`role.in.(administrador,recepcao),id.eq.${event.requester_id}`);
    const emails = [
      ...new Set(
        (recipients ?? []).map((recipient) => recipient.email).filter(Boolean),
      ),
    ];
    const configurationError = getEmailConfigurationError();
    let sent = 0;
    const failures: string[] = [];
    for (const email of emails) {
      try {
        if (configurationError) throw new Error(configurationError);
        const messageId = await sendTransactionalEmail({
          to: email,
          subject: `Evento cancelado — ${event.title}`,
          idempotencyKey: `event-cancelled-${event.id}-${email}`,
          html: `<h2>Evento cancelado</h2><p>O evento <strong>${escapeHtml(event.title)}</strong>, previsto para ${event.start_date} às ${String(event.start_time).slice(0, 5)}, foi cancelado.</p><p><strong>Motivo:</strong> ${escapeHtml(reason)}</p><p>Cancelado por ${escapeHtml(actor.full_name || actor.email)}.</p>`,
        });
        await db
          .from("email_deliveries")
          .insert({
            event_id: event.id,
            recipient_email: email,
            template: "event_cancelled",
            status: "enviado",
            provider_message_id: messageId,
            sent_at: new Date().toISOString(),
          });
        sent += 1;
      } catch (sendError) {
        const message =
          sendError instanceof Error ? sendError.message : "Falha desconhecida";
        failures.push(`${email}: ${message}`);
        await db
          .from("email_deliveries")
          .insert({
            event_id: event.id,
            recipient_email: email,
            template: "event_cancelled",
            status: configurationError ? "ignorado" : "falhou",
            error_message: message,
          });
      }
    }
    return NextResponse.json({
      success: true,
      sent,
      failed: failures.length,
      failures,
    });
  } catch (error) {
    console.error("Erro ao cancelar evento:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Não foi possível cancelar o evento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
