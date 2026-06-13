import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

/** Send a transactional email. Dev fallback: if SMTP isn't configured, log to the
 *  server console so the auth flows are testable without a real mailbox. */
export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM ?? "FuFi <no-reply@fufi.app>";
  if (!transport) {
    console.info(`\n──────── [FuFi mail · DEV — no SMTP configured] ────────\nTo: ${to}\nSubject: ${subject}\n\n${text}\n────────────────────────────────────────────────────────\n`);
    return;
  }
  await transport.sendMail({ from, to, subject, html, text });
}
