import { getTransporter } from './client';
import { SENDER, BRAND } from './config';
import type { EmailMessage, SendResult } from './types';
import { logger } from '../utils/logger';

/**
 * The ONLY door out of this application for email.
 *
 * Every template goes through here so that validation, retries, logging and the
 * staging safety net are applied once, in one place, instead of being
 * reimplemented (or forgotten) per email.
 */

const EMAIL_PATTERN = /^[^\s@,;:<>"]+@[^\s@,;:<>"]+\.[^\s@,;:<>"]+$/;

/**
 * Rejects anything that is not a plain address.
 *
 * Newlines are the important part: a recipient containing \r\n can append extra
 * SMTP headers (a hidden Bcc, a forged Reply-To). That is header injection, and
 * the old code passed whatever arrived in the request body straight through.
 */
export function isValidEmailAddress(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  if (/[\r\n\t]/.test(trimmed)) return false;
  return EMAIL_PATTERN.test(trimmed);
}

/** Keeps only valid, unique addresses (case-insensitive). */
function normaliseRecipients(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to];
  const seen = new Set<string>();
  const valid: string[] = [];

  for (const candidate of list) {
    if (!isValidEmailAddress(candidate)) {
      logger.warn('Email recipient rejected as invalid', { recipient: String(candidate).slice(0, 80) });
      continue;
    }
    const clean = candidate.trim();
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(clean);
  }

  return valid;
}

/**
 * A permanent SMTP failure (5xx) means the address is bad or we are blocked —
 * retrying only wastes time and further annoys the provider. Transient failures
 * (4xx, timeouts, dropped sockets) are worth one more attempt.
 */
function isRetryable(error: unknown): boolean {
  const code = (error as { responseCode?: number })?.responseCode;
  if (typeof code === 'number') return code < 500;
  return true; // network-level failure with no SMTP code
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function sendEmail(message: EmailMessage, label = 'email'): Promise<SendResult> {
  const recipients = normaliseRecipients(message.to);

  if (recipients.length === 0) {
    logger.error(`No valid recipient for ${label}`);
    return { success: false, error: 'No valid recipient address.' };
  }

  // Staging safety net: when EMAIL_REDIRECT_TO is set, every message goes there
  // instead of to real customers. This is what makes it safe to point a test
  // deployment at a copy of production data.
  const redirectTo = process.env.EMAIL_REDIRECT_TO;
  const finalRecipients = redirectTo && isValidEmailAddress(redirectTo) ? [redirectTo] : recipients;
  const wasRedirected = finalRecipients !== recipients;

  if (process.env.EMAIL_DISABLED === 'true') {
    logger.info(`Email suppressed by EMAIL_DISABLED: ${label}`, { count: recipients.length });
    return { success: true, messageId: null, skipped: true, reason: 'EMAIL_DISABLED' };
  }

  const mailOptions = {
    from: { name: SENDER.name, address: SENDER.address },
    to: finalRecipients,
    subject: wasRedirected ? `[redirected] ${message.subject}` : message.subject,
    html: message.html,
    text: message.text,
    replyTo: message.replyTo ?? BRAND.supportEmail,
    headers: {
      'X-Mailer': 'UNLIMITED-SW',
      'X-Priority': '3',
      'List-Unsubscribe': `<mailto:${BRAND.supportEmail}?subject=Unsubscribe>`,
      ...message.headers,
    },
  };

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await getTransporter().sendMail(mailOptions);
      // Recipient addresses are deliberately not logged — customer email is
      // personal data and these logs are retained by the host.
      logger.info(`Sent ${label}`, { messageId: result.messageId, recipients: finalRecipients.length });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';

      if (attempt < maxAttempts && isRetryable(error)) {
        logger.warn(`Retrying ${label} after a transient failure`, { attempt, detail });
        await delay(500);
        continue;
      }

      logger.error(`Failed to send ${label}`, { attempts: attempt, detail });
      return { success: false, error: detail };
    }
  }

  // Unreachable: the loop always returns.
  return { success: false, error: 'Send loop exited unexpectedly.' };
}
