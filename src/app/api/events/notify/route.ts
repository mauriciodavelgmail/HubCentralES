import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Configuração administrativa do Supabase ausente.');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] as string);
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Sessão não informada.' }, { status: 401 });
    const supabase = adminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });

    const { eventId, action = 'created' } = await request.json();
    if (!eventId) return NextResponse.json({ error: 'Evento não informado.' }, { status: 400 });
    const [{ data: actor }, { data: event, error: eventError }] = await Promise.all([
      supabase.from('profiles').select('id,role').eq('user_id', user.id).eq('is_active', true).single(),
      supabase.from('events').select('id,title,status,start_date,start_time,end_time,requester_id').eq('id', eventId).single(),
    ]);
    if (eventError || !event || !actor) return NextResponse.json({ error: 'Evento ou perfil não encontrado.' }, { status: 404 });
    if (actor.role !== 'administrador' && actor.id !== event.requester_id) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });

    const { data: recipients } = await supabase.from('profiles').select('email,role').eq('is_active', true)
      .or(`role.eq.administrador,id.eq.${event.requester_id}`);
    const emails = [...new Set((recipients ?? []).map((item) => item.email).filter(Boolean))];
    if (!emails.length) return NextResponse.json({ sent: 0 });

    const provider = (process.env.EMAIL_PROVIDER || (process.env.GMAIL_USER ? 'gmail' : 'resend')).toLowerCase();
    if (!['gmail', 'resend'].includes(provider)) return NextResponse.json({ error: 'EMAIL_PROVIDER deve ser gmail ou resend.' }, { status: 500 });
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replaceAll(' ', '');
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EVENT_EMAIL_FROM || (gmailUser ? `HubCentral ES+ <${gmailUser}>` : '');
    const configurationError = provider === 'gmail'
      ? (!gmailUser || !gmailPassword || !from ? 'GMAIL_USER, GMAIL_APP_PASSWORD ou EVENT_EMAIL_FROM não configurado' : '')
      : (!resendKey || !from ? 'RESEND_API_KEY ou EVENT_EMAIL_FROM não configurado' : '');
    if (configurationError) {
      await supabase.from('email_deliveries').insert(emails.map((email) => ({ event_id: event.id, recipient_email: email, template: action, status: 'ignorado', error_message: configurationError })));
      return NextResponse.json({ error: 'Envio de e-mail ainda não configurado na Vercel.', sent: 0 }, { status: 503 });
    }

    const title = escapeHtml(event.title);
    const status = escapeHtml(String(event.status).replaceAll('_', ' '));
    const subject = action === 'created' ? `Nova solicitação de agenda: ${event.title}` : `Agenda atualizada: ${event.title}`;
    const html = `<h2>${title}</h2><p>Status: <strong>${status}</strong></p><p>Data: ${event.start_date}, das ${event.start_time.slice(0, 5)} às ${event.end_time.slice(0, 5)}.</p><p>Acesse o HubCentral ES+ para acompanhar.</p>`;
    const transporter = provider === 'gmail'
      ? nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: gmailUser, pass: gmailPassword },
        })
      : null;
    let sent = 0;
    const failures: string[] = [];
    for (const email of emails) {
      const delivery = { event_id: event.id, recipient_email: email, template: action };
      try {
        let messageId: string | null = null;
        if (provider === 'gmail' && transporter) {
          const result = await transporter.sendMail({ from, to: email, subject, html });
          messageId = result.messageId || null;
        } else {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `event-${event.id}-${action}-${email}` },
            body: JSON.stringify({ from, to: [email], subject, html }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.message ?? `HTTP ${response.status}`);
          messageId = payload.id ?? null;
        }
        sent += 1;
        await supabase.from('email_deliveries').insert({ ...delivery, status: 'enviado', provider_message_id: messageId, sent_at: new Date().toISOString() });
      } catch (sendError) {
        const message = sendError instanceof Error ? sendError.message : 'Falha desconhecida no provedor de e-mail';
        failures.push(`${email}: ${message}`);
        await supabase.from('email_deliveries').insert({ ...delivery, status: 'falhou', error_message: message });
      }
    }
    if (!sent) return NextResponse.json({ error: 'Nenhum e-mail foi enviado. Consulte email_deliveries para verificar o erro do provedor.', sent, failures }, { status: 502 });
    return NextResponse.json({ sent, failed: failures.length });
  } catch (error) {
    console.error('Erro ao notificar evento por e-mail:', error);
    return NextResponse.json({ error: 'Não foi possível enviar as notificações por e-mail.' }, { status: 500 });
  }
}
