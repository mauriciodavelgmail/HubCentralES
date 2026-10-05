import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = client();
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
    } = await supabase.auth.getUser(token);
    if (authError || !user)
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    const { id: eventId } = await context.params;
    const { participantIds } = await request.json();
    const [{ data: actor }, { data: event }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single(),
      supabase
        .from("events")
        .select("id,title,start_date,start_time,requester_id")
        .eq("id", eventId)
        .single(),
    ]);
    if (
      !actor ||
      !event ||
      (actor.role !== "administrador" && actor.id !== event.requester_id)
    )
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 },
      );
    let query = supabase
      .from("attendance_list")
      .select("id,participant_name,participant_email,access_link")
      .eq("event_id", eventId);
    if (Array.isArray(participantIds) && participantIds.length)
      query = query.in("id", participantIds);
    const { data: participants, error } = await query;
    if (error) throw error;
    const configurationError = getEmailConfigurationError();
    let sent = 0;
    const failures: Array<{ id: string; error: string }> = [];
    for (const participant of participants ?? []) {
      const accessUrl = `${request.nextUrl.origin}/participante/${participant.access_link}`;
      try {
        if (configurationError) throw new Error(configurationError);
        const qr = await QRCode.toBuffer(accessUrl, {
          width: 500,
          margin: 2,
          errorCorrectionLevel: "M",
        });
        const messageId = await sendTransactionalEmail({
          to: participant.participant_email,
          subject: `Credenciamento — ${event.title}`,
          idempotencyKey: `participant-${participant.id}-${participant.access_link}`,
          attachments: [
            {
              filename: "qrcode-credenciamento.png",
              content: qr,
              contentType: "image/png",
              cid: "qrcode",
            },
          ],
          html: `<h2>${event.title}</h2><p>Olá, ${participant.participant_name}.</p><p>Seu credenciamento foi realizado. Apresente o QR Code anexo na recepção.</p><p><a href="${accessUrl}">Abrir credencial digital</a></p><p>Data: ${event.start_date}, às ${String(event.start_time).slice(0, 5)}.</p>`,
        });
        await Promise.all([
          supabase
            .from("attendance_list")
            .update({ invitation_status: "enviado", invitation_error: null })
            .eq("id", participant.id),
          supabase
            .from("email_deliveries")
            .insert({
              event_id: eventId,
              participant_id: participant.id,
              recipient_email: participant.participant_email,
              template: "participant_invitation",
              status: "enviado",
              provider_message_id: messageId,
              sent_at: new Date().toISOString(),
            }),
        ]);
        sent += 1;
      } catch (sendError) {
        const message =
          sendError instanceof Error ? sendError.message : "Falha desconhecida";
        failures.push({ id: participant.id, error: message });
        await Promise.all([
          supabase
            .from("attendance_list")
            .update({
              invitation_status: configurationError ? "ignorado" : "falhou",
              invitation_error: message,
            })
            .eq("id", participant.id),
          supabase
            .from("email_deliveries")
            .insert({
              event_id: eventId,
              participant_id: participant.id,
              recipient_email: participant.participant_email,
              template: "participant_invitation",
              status: configurationError ? "ignorado" : "falhou",
              error_message: message,
            }),
        ]);
      }
    }
    return NextResponse.json(
      { sent, failed: failures.length, failures },
      { status: failures.length && !sent ? 502 : 200 },
    );
  } catch (error) {
    console.error("Erro ao enviar convites:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar os convites.",
      },
      { status: 500 },
    );
  }
}
