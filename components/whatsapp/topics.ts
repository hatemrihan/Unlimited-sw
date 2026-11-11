/**
 * The WhatsApp button's topics (3 Nov 2026). The button says "Questions?"
 * in English on every page; the topics and the message they open with are
 * Arabic, because the people writing to us write in Arabic (Hatem's call).
 */

export interface WhatsAppTopic {
  id: 'product';
  label: string;
  message: string;
}

export const WHATSAPP_TOPICS: readonly WhatsAppTopic[] = [
  { id: 'product', label: 'استفسار عن منتج', message: 'السلام عليكم، أريد الاستفسار عن منتج.' },
];

/**
 * Is this CSS colour light? `rgb(…)`/`rgba(…)`; a see-through colour is
 * "unknown" (null) so the caller keeps looking further down. Pure.
 */
export function isLightColour(colour: string): boolean | null {
  const c = (colour || '').trim().toLowerCase();
  const nums = (c.match(/-?[\d.]+%?/g) ?? []).map((n) => (n.endsWith('%') ? Number(n.slice(0, -1)) / 100 : Number(n)));
  // The alpha, when written: rgba(r, g, b, a) or "… / a".
  const slash = c.includes('/') ? Number((c.split('/')[1].match(/[\d.]+%?/) ?? ['1'])[0].replace('%', '')) : null;
  const alpha = slash !== null ? (c.split('/')[1].includes('%') ? slash / 100 : slash)
    : c.startsWith('rgba') && nums.length >= 4 ? nums[3] : 1;
  if (c === 'transparent' || alpha < 0.5 || nums.length < 3) return null;

  // Tailwind 4 colours arrive as lab() / oklch(); the browser keeps them that
  // way. Their first number is the lightness: 0–100 in lab, 0–1 in ok*, or a %.
  const lightnessIsPercent = /^[a-z]+\(\s*-?[\d.]+%/.test(c);
  if (c.startsWith('lab(')) return (lightnessIsPercent ? nums[0] : nums[0] / 100) > 0.6;
  if (c.startsWith('oklab(') || c.startsWith('oklch(')) return nums[0] > 0.6;
  if (c.startsWith('color(srgb')) return (0.299 * nums[0] + 0.587 * nums[1] + 0.114 * nums[2]) > 0.6;
  if (c.startsWith('rgb')) return (0.299 * nums[0] + 0.587 * nums[1] + 0.114 * nums[2]) / 255 > 0.6;
  return null;
}

/** wa.me wants the number as digits only, no +, no spaces. Pure. */
export function whatsappDigits(phone: string): string {
  return (phone || '').replace(/[^0-9]/g, '');
}

/**
 * The link a topic opens: the chat with our number, the message already
 * typed. Null when there is no usable number (the button then hides).
 */
export function whatsappLink(phone: string, message: string): string | null {
  const digits = whatsappDigits(phone);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
