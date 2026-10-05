import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { sendTransactionalEmail } from "@/lib/email/server";

const supabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const { data, error } = await supabase()
    .from("events")
    .select("id,title,description,start_date,start_time,end_time,spaces(name)")
    .eq("public_registration_token", token)
    .eq("public_registration_enabled", true)
    .eq("status", "confirmada")
    .single();
  if (error || !data)
    return NextResponse.json(
      { error: "Inscrição pública indisponível." },
      { status: 404 },
    );
  return NextResponse.json({ event: data });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const db = supabase();
  try {
    const { token } = await context.params;
    const { data: event } = await db
      .from("events")
      .select("id,title,start_date,start_time")
      .eq("public_registration_token", token)
      .eq("public_registration_enabled", true)
      .eq("status", "confirmada")
      .single();
    if (!event)
      return NextResponse.json(
        { error: "Inscrição pública indisponível." },
        { status: 404 },
      );
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body.phone || "").trim();
    if (!name || !email || !phone)
      return NextResponse.json(
        { error: "Nome, e-mail e telefone são obrigatórios." },
        { status: 400 },
      );
    const { data: participant, error } = await db
      .from("attendance_list")
      .insert({
        event_id: event.id,
        participant_name: name,
        participant_email: email,
        participant_phone: phone,
        document: String(body.document || "").trim() || null,
        age: body.age ? Number(body.age) : null,
        city: String(body.city || "").trim() || null,
        neighborhood: String(body.neighborhood || "").trim() || null,
        registration_source: "publico",
      })
      .select("*")
      .single();
    if (error) throw error;
    const accessUrl = `${request.nextUrl.origin}/participante/${participant.access_link}`;
    try {
      const qr = await QRCode.toBuffer(accessUrl, { width: 500, margin: 2 });
      const messageId = await sendTransactionalEmail({
        to: email,
        subject: `Credenciamento — ${event.title}`,
        idempotencyKey: `participant-${participant.id}-${participant.access_link}`,
        attachments: [
          {
            filename: "qrcode-credenciamento.png",
            content: qr,
            contentType: "image/png",
          },
        ],
        html: `<h2>${event.title}</h2><p>Olá, ${name}.</p><p>Sua inscrição foi confirmada. Apresente o QR Code anexo na recepção.</p><p><a href="${accessUrl}">Abrir credencial digital</a></p>`,
      });
      await Promise.all([
        db
          .from("attendance_list")
          .update({ invitation_status: "enviado" })
          .eq("id", participant.id),
        db
          .from("email_deliveries")
          .insert({
            event_id: event.id,
            participant_id: participant.id,
            recipient_email: email,
            template: "participant_invitation",
            status: "enviado",
            provider_message_id: messageId,
            sent_at: new Date().toISOString(),
          }),
      ]);
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : "Falha no envio";
      await Promise.all([
        db
          .from("attendance_list")
          .update({ invitation_status: "falhou", invitation_error: message })
          .eq("id", participant.id),
        db
          .from("email_deliveries")
          .insert({
            event_id: event.id,
            participant_id: participant.id,
            recipient_email: email,
            template: "participant_invitation",
            status: "falhou",
            error_message: message,
          }),
      ]);
    }
    return NextResponse.json({ success: true, accessUrl }, { status: 201 });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Não foi possível concluir a inscrição.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
