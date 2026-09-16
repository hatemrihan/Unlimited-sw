'use client';

/**
 * The browser boundary for Meta Pixel standard events.
 *
 * The storefront's funnel is first-party and can operate with tracking
 * disabled. Meta is deliberately a separate best-effort copy: an ad blocker,
 * a network failure, or the Pixel script arriving late must never affect a
 * customer action.
 */
type MetaPixelFunction = (
  action: 'track',
  eventName: string,
  parameters?: Record<string, unknown>,
  options?: { eventID: string },
) => void;

interface MetaProductEvent {
  productId: string;
  productName: string;
  value: number;
}

interface MetaCartEvent extends MetaProductEvent {
  variantName?: string;
  quantity: number;
}

interface MetaPurchaseItem {
  id: string;
  quantity: number;
  itemPrice: number;
}

interface MetaPurchaseEvent {
  orderId: string;
  value: number;
  items: MetaPurchaseItem[];
}

/** The only order data handed from checkout to the thank-you page for Meta. */
export const META_PURCHASE_STORAGE_KEY = 'usw_meta_purchase';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseMetaPurchase(value: unknown): MetaPurchaseEvent | null {
  if (
    !isRecord(value) ||
    typeof value.orderId !== 'string' ||
    typeof value.value !== 'number' ||
    !Number.isFinite(value.value)
  ) {
    return null;
  }

  if (!Array.isArray(value.items)) return null;

  const items: MetaPurchaseItem[] = [];

  for (const item of value.items) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.quantity !== 'number' ||
      !Number.isFinite(item.quantity) ||
      typeof item.itemPrice !== 'number' ||
      !Number.isFinite(item.itemPrice)
    ) {
      return null;
    }

    items.push({ id: item.id, quantity: item.quantity, itemPrice: item.itemPrice });
  }

  return { orderId: value.orderId, value: value.value, items };
}

function pixel(): MetaPixelFunction | null {
  if (typeof window === 'undefined') return null;

  const fbq = (window as Window & { fbq?: MetaPixelFunction }).fbq;
  return typeof fbq === 'function' ? fbq : null;
}

function safelyTrack(
  eventName: string,
  parameters?: Record<string, unknown>,
  options?: { eventID: string },
): void {
  try {
    const fbq = pixel();
    if (!fbq) return;

    if (parameters === undefined) {
      fbq('track', eventName);
      return;
    }

    if (options === undefined) {
      fbq('track', eventName, parameters);
      return;
    }

    fbq('track', eventName, parameters, options);
  } catch {
    // Measurement is never allowed to break shopping.
  }
}

export function trackMetaPageView(): void {
  safelyTrack('PageView');
}

export function trackMetaViewContent(event: MetaProductEvent): void {
  safelyTrack('ViewContent', {
    content_ids: [event.productId],
    content_name: event.productName,
    content_type: 'product',
    value: event.value,
    currency: 'EGP',
  });
}

export function trackMetaAddToCart(event: MetaCartEvent): void {
  safelyTrack('AddToCart', {
    content_ids: [event.productId],
    content_name: event.productName,
    content_type: 'product',
    ...(event.variantName ? { content_variant: event.variantName } : {}),
    contents: [{ id: event.productId, quantity: event.quantity }],
    value: event.value,
    currency: 'EGP',
  });
}

export function trackMetaInitiateCheckout(event: { itemCount: number; value: number }): void {
  safelyTrack('InitiateCheckout', {
    num_items: event.itemCount,
    value: event.value,
    currency: 'EGP',
  });
}

export function trackMetaPurchase(event: MetaPurchaseEvent): void {
  safelyTrack(
    'Purchase',
    {
      content_ids: event.items.map(item => item.id),
      content_type: 'product',
      contents: event.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.itemPrice,
      })),
      value: event.value,
      currency: 'EGP',
    },
    { eventID: `purchase:${event.orderId}` },
  );
}

/**
 * Delivers the completed order's browser Pixel event exactly once per tab.
 *
 * Checkout writes only the small commerce payload under
 * `META_PURCHASE_STORAGE_KEY`; this parser intentionally drops any accidental
 * extra fields before data reaches Meta. The sent marker remains for this tab
 * so a refresh of `/thankyou` cannot create a second purchase.
 */
export function consumeMetaPurchase(): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = sessionStorage.getItem(META_PURCHASE_STORAGE_KEY);
    if (!raw) return;

    sessionStorage.removeItem(META_PURCHASE_STORAGE_KEY);

    const event = parseMetaPurchase(JSON.parse(raw));
    if (!event) return;

    const sentKey = `usw_meta_purchase_sent:${event.orderId}`;
    if (sessionStorage.getItem(sentKey)) return;

    sessionStorage.setItem(sentKey, '1');
    trackMetaPurchase(event);
  } catch {
    // Session storage may be unavailable. Measurement remains optional.
  }
}

export type { MetaPurchaseEvent };
