import nodemailer from "nodemailer";

/** True when the server has a host to send through. The from-address can fall back. */
export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

export function smtpNotReadyMessage(): string {
  return "This server is not set up to send email yet. An operator needs to set SMTP_HOST before confirmation and password-reset messages can be delivered.";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendAppEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  const from = process.env.EMAIL_FROM?.trim() || "GRISSA <noreply@localhost>";
  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export function emailLinkHtml(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<p><a href="${safeHref}">${safeLabel}</a></p>`;
}
