import nodemailer from 'nodemailer';

/**
 * The ONLY place in the codebase that connects to Brevo.
 *
 * Nothing else may import nodemailer. When we move from SMTP to Brevo's HTTP API
 * (BREVO_API_KEY is already in the environment), this is the single file that
 * changes — every template and caller stays exactly as it is.
 *
 * The connection is created on first use and reused, not built at import time:
 * building it at import made every cold start pay for a connection even on
 * requests that send no email, and it threw during the build if the env vars
 * were absent.
 */

let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASSWORD;

  // No hardcoded fallback credential. A missing secret must fail loudly here,
  // not silently send from whatever account happens to be baked into the source.
  if (!user || !pass) {
    throw new Error(
      'Email is not configured: BREVO_SMTP_USER and BREVO_SMTP_PASSWORD must both be set.'
    );
  }

  transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    // Reuse one connection for the several mails a single order sends,
    // instead of a fresh TLS handshake per message.
    pool: true,
    maxConnections: 2,
    maxMessages: 20,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

/** Test seam — lets a test swap the transport without reaching into module state. */
export function __setTransporterForTests(t: nodemailer.Transporter | null): void {
  transporter = t;
}
