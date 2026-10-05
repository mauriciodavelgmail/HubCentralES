import nodemailer from "nodemailer";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
}

export function getEmailProvider() {
  const raw =
    process.env.EMAIL_PROVIDER || (process.env.GMAIL_USER ? "gmail" : "resend");
  const normalized = raw
    .trim()
    .replace(/^EMAIL_PROVIDER\s*=\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .trim()
    .toLowerCase();
  if (normalized.includes("gmail")) return "gmail";
  if (normalized.includes("resend")) return "resend";
  if (process.env.GMAIL_USER || process.env.GMAIL_APP_PASSWORD) return "gmail";
  if (process.env.RESEND_API_KEY) return "resend";
  return normalized;
}

export function getEmailConfigurationError() {
  const provider = getEmailProvider();
  if (!["gmail", "resend"].includes(provider))
    return "EMAIL_PROVIDER deve ser gmail ou resend.";
  const from =
    process.env.EVENT_EMAIL_FROM ||
    (process.env.GMAIL_USER
      ? `HubCentral ES+ <${process.env.GMAIL_USER}>`
      : "");
  if (!from) return "EVENT_EMAIL_FROM não configurado.";
  if (
    provider === "gmail" &&
    (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
  )
    return "GMAIL_USER ou GMAIL_APP_PASSWORD não configurado.";
  if (provider === "resend" && !process.env.RESEND_API_KEY)
    return "RESEND_API_KEY não configurado.";
  return "";
}

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  attachments?: EmailAttachment[];
}) {
  const configurationError = getEmailConfigurationError();
  if (configurationError) throw new Error(configurationError);
  const provider = getEmailProvider();
  const from =
    process.env.EVENT_EMAIL_FROM ||
    `HubCentral ES+ <${process.env.GMAIL_USER}>`;
  if (provider === "gmail") {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD?.replaceAll(" ", ""),
      },
    });
    const result = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
    return result.messageId || null;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((item) => ({
        filename: item.filename,
        content: item.content.toString("base64"),
        content_type: item.contentType,
      })),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.message ?? `HTTP ${response.status}`);
  return payload.id ?? null;
}
