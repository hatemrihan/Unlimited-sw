import { BRAND, CURRENCY, currentYear } from '../config';

/**
 * The shell every UNLIMITED email shares, plus the small helpers templates need.
 *
 * Design: the original UNLIMITED-SW look — a black wordmark banner, a white
 * card on a light grey page, and content organised into boxes with a coloured
 * left border rather than hairline rules.
 *
 * Why it is built from <table> elements: email clients are not browsers. Outlook
 * renders with Microsoft Word's engine, and Gmail strips <style> blocks in many
 * contexts. Tables with inline styles are the only layout that survives all of
 * them intact — this is standard practice for email, not legacy sloppiness.
 */

export const TOKENS = {
  pageBg: '#f5f5f5',
  surface: '#ffffff',
  text: '#333333',
  muted: '#666666',
  faint: '#999999',
  rule: '#eeeeee',
  cardBorder: '#dddddd',
  headerBg: '#000000',
  headerText: '#ffffff',
  accent: '#4CAF50',
  width: 600,
  font: "Arial, Helvetica, sans-serif",
} as const;

/**
 * Makes text safe to place inside HTML.
 *
 * Customer names, addresses and notes are typed by strangers and were previously
 * dropped into the markup raw — a name containing a tag reshaped the email, and
 * could have injected a link into mail sent from our own domain.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `6357` -> `6,357 L.E` */
export function money(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${safe.toLocaleString('en-US')} ${CURRENCY}`;
}

/** Paragraph in body copy. */
export function paragraph(html: string, marginTop = 0): string {
  return `<p style="margin:${marginTop}px 0 0 0;padding:0;font-size:15px;line-height:1.65;color:${TOKENS.text};">${html}</p>`;
}

/** Small muted line, used under a heading. */
export function subtle(html: string, marginTop = 4): string {
  return `<p style="margin:${marginTop}px 0 0 0;padding:0;font-size:14px;line-height:1.6;color:${TOKENS.muted};">${html}</p>`;
}

/** Vertical space between sections. */
export function rule(margin = 30): string {
  return `<div style="height:${margin}px;line-height:${margin}px;font-size:0;">&nbsp;</div>`;
}

/** Section label above a block — bold, plain case, dark. */
export function sectionLabel(text: string): string {
  return `<p style="margin:0 0 12px 0;padding:0;font-size:15px;line-height:1.5;font-weight:bold;color:${TOKENS.text};">${escapeHtml(text)}</p>`;
}

interface LayoutOptions {
  /** Shown in the inbox preview line, next to the subject. */
  preheader: string;
  /** Bold line under the wordmark — the email's identity, e.g. "Order #1042". */
  title: string;
  /** Muted line under the title, e.g. "Confirmed - 10 August 2026". */
  subtitle?: string;
  /** The body, already rendered. */
  body: string;
  /** Links shown in the footer. */
  footerLinks?: Array<{ label: string; href: string }>;
  /** Set for an Arabic email so the whole document flows right-to-left. */
  dir?: 'ltr' | 'rtl';
}

export function layout({
  preheader,
  title,
  subtitle,
  body,
  footerLinks = [
    { label: 'Shop', href: BRAND.shopUrl },
    { label: 'Contact', href: BRAND.contactUrl },
  ],
  dir = 'ltr',
}: LayoutOptions): string {
  const align = dir === 'rtl' ? 'right' : 'left';

  const links = footerLinks
    .map(
      (link, i) =>
        `<a href="${escapeHtml(link.href)}" style="color:${TOKENS.text};text-decoration:none;font-weight:${i === 0 ? 'bold' : 'normal'};">${escapeHtml(link.label)}</a>`
    )
    .join(`<span style="color:${TOKENS.faint};"> &nbsp;|&nbsp; </span>`);

  return `<!DOCTYPE html>
<html lang="en" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${TOKENS.pageBg};color:${TOKENS.text};">
<!-- Inbox preview text: shown beside the subject, then hidden in the message. -->
<div style="display:none;font-size:1px;color:${TOKENS.pageBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${TOKENS.pageBg};">
  <tr>
    <td align="center" style="padding:20px 16px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${TOKENS.width}" style="width:100%;max-width:${TOKENS.width}px;background-color:${TOKENS.surface};border:1px solid ${TOKENS.cardBorder};">

        <!-- Header -->
        <tr>
          <td align="center" style="background-color:${TOKENS.headerBg};padding:20px;font-family:${TOKENS.font};">
            <p style="margin:0;padding:0;font-size:28px;line-height:1;letter-spacing:2px;font-weight:bold;color:${TOKENS.headerText};">${escapeHtml(BRAND.name)}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td dir="${dir}" align="${align}" style="padding:30px 40px;font-family:${TOKENS.font};text-align:${align};">

            <!-- Identity -->
            <p style="margin:0 0 20px 0;padding:0;font-size:16px;line-height:1.5;font-weight:bold;color:${TOKENS.text};">${escapeHtml(title)}${subtitle ? ` — ${escapeHtml(subtitle)}` : ''}</p>

            ${body}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="background-color:${TOKENS.pageBg};padding:20px;border-top:1px solid ${TOKENS.cardBorder};font-family:${TOKENS.font};text-align:center;">
            <p style="margin:0;padding:0;font-size:13px;line-height:1.6;color:${TOKENS.muted};">${links}</p>
            <p style="margin:10px 0 0 0;padding:0;font-size:12px;line-height:1.6;color:${TOKENS.faint};">© ${currentYear()} ${escapeHtml(BRAND.name)}. All rights reserved.</p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`;
}
