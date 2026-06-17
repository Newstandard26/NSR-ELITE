import nodemailer from "nodemailer";

// SMTP email via nodemailer (e.g. Gmail/Workspace with an App Password).
// If SMTP env vars are absent, sends are mocked (logged) so the app and the
// invite flow keep working in dev/preview without credentials.

export function emailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getTransport() {
  if (!emailConfigured()) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(mail: MailInput): Promise<{ mocked: boolean }> {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@localhost";
  const transport = getTransport();
  if (!transport) {
    console.log(`[email mock] would send "${mail.subject}" to ${mail.to} from ${from}`);
    return { mocked: true };
  }
  await transport.sendMail({ from, ...mail });
  return { mocked: false };
}
