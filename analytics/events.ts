/**
 * The event contract, shared by the browser and the server.
 *
 * Deliberately Meta's vocabulary — `PageView`, `ViewContent`, `AddToCart`,
 * `InitiateCheckout`, `Purchase`. Not because we use Meta today (we do not),
 * but because these names map one-to-one onto both Meta Pixel and GA4
 * (`page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`).
 * Inventing our own would mean a translation layer the day a pixel is added,
 * and translation layers are where funnels quietly stop agreeing with ad
 * platforms.
 */

/** The funnel, in order. Every report walks this array — nothing hardcodes the sequence. */
export const FUNNEL_STAGES = [
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'Purchase',
] as const;

export type EventName = (typeof FUNNEL_STAGES)[number];

/**
 * Everything an event may carry.
 *
 * An allowlist, not a suggestion — `schema.ts` rejects any key not named here.
 * That is what keeps personal data out of this collection by construction
 * rather than by everyone remembering: there is no field for an email, a phone,
 * a name or an address, so a well-meaning `track()` call cannot add one.
 */
export interface EventPayload {
  /** PageView. The route, never the full URL — query strings carry referral ids and worse. */
  path?: string;

  productId?: string;
  productName?: string;
  variantName?: string;
  quantity?: number;

  /** Money, in EGP. AddToCart line value, or the order total for Purchase. */
  value?: number;
  currency?: 'EGP';

  /** Purchase only, and written by the server. */
  orderId?: string;
  itemCount?: number;

  /**
   * Which side recorded this.
   *
   * Purchase is written server-side from the committed order, so it survives
   * ad-blockers and closed tabs. This field is what lets the report tell that
   * apart from a client-reported event if the two ever disagree.
   */
  source?: 'client' | 'server';
}

/** One event, as the browser sends it and as the collection stores it. */
export interface AnalyticsEventInput {
  name: EventName;
  sessionId: string;
  eventId: string;
  payload?: EventPayload;
}

/** The keys `schema.ts` will accept inside `payload`. Derived from the type above by hand — keep in step. */
export const ALLOWED_PAYLOAD_KEYS: ReadonlyArray<keyof EventPayload> = [
  'path',
  'productId',
  'productName',
  'variantName',
  'quantity',
  'value',
  'currency',
  'orderId',
  'itemCount',
  'source',
];

/** The most events one request may carry. Batching is expected; unbounded batches are not. */
export const MAX_EVENTS_PER_REQUEST = 20;

/** How long a raw event is kept. Past this the funnel has long since been read. */
export const RETENTION_DAYS = 180;

/** Idle time after which a returning visitor counts as a new session. GA's default. */
export const SESSION_IDLE_MINUTES = 30;
