'use client';

import {
  MAX_EVENTS_PER_REQUEST,
  SESSION_IDLE_MINUTES,
  type EventName,
  type EventPayload,
} from '../events';
import {
  trackMetaAddToCart,
  trackMetaInitiateCheckout,
  trackMetaPageView,
  trackMetaViewContent,
} from './metaPixel';

/**
 * The browser side of the funnel.
 *
 * Three jobs, and the second is the one that pays for the feature:
 *
 *  1. Give every visitor a session id that survives page navigation.
 *  2. BATCH events, because every request is a serverless invocation. Eight
 *     thousand visitors at six page views each is ~50,000 invocations a day if
 *     each event is its own request. Batched, most sessions send one or two.
 *     The storefront just had its session polling removed for exactly this
 *     reason; adding a new per-event call would give the cost straight back.
 *  3. Never, under any circumstances, break the page it is measuring.
 */

const SESSION_KEY = 'usw_sid';
const FLUSH_INTERVAL_MS = 5000;
const ENDPOINT = '/api/analytics/events';

interface QueuedEvent {
  name: EventName;
  sessionId: string;
  eventId: string;
  payload: EventPayload;
}

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

/** Used when localStorage is unavailable — private mode, or storage disabled. */
let memorySessionId: string | null = null;

/**
 * A real RFC-4122 v4 UUID, always.
 *
 * Not the looser fallback `lib/clientOrderId.ts` uses. That one may return a
 * plain hex string, which is fine there — the server treats it as opaque. Here
 * the ingest schema validates `uuid()` strictly, so a non-UUID would be refused
 * at the door and the event would vanish with nothing to show for it. The
 * browsers that lack `randomUUID` are exactly the old phones we most want in
 * the funnel, so the fallback has to produce the real format.
 */
function newUuid(): string {
  const webCrypto = globalThis.crypto;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  // Version 4 and the RFC's variant bits — what makes this a valid UUID rather
  // than 32 random hex characters wearing dashes.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * This visitor's session, starting a new one after 30 minutes of inactivity.
 *
 * The idle window is GA's default, and the reason to match it is that the two
 * sets of numbers get compared. A funnel whose "sessions" mean something
 * different from GA's "sessions" invites an afternoon of reconciling figures
 * that were never measuring the same thing.
 */
export function getSessionId(): string {
  const now = Date.now();
  const idleMs = SESSION_IDLE_MINUTES * 60_000;

  try {
    const raw = localStorage.getItem(SESSION_KEY);

    if (raw) {
      const stored = JSON.parse(raw) as { id?: string; lastSeen?: number };

      if (stored?.id && typeof stored.lastSeen === 'number' && now - stored.lastSeen < idleMs) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ id: stored.id, lastSeen: now }));
        return stored.id;
      }
    }

    const id = newUuid();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastSeen: now }));
    return id;
  } catch {
    // Storage blocked or corrupt. Keep counting this visitor for as long as the
    // tab lives rather than dropping them from the funnel entirely.
    if (!memorySessionId) memorySessionId = newUuid();
    return memorySessionId;
  }
}

/**
 * Whether to record anything at all.
 *
 * Three separate reasons not to, and all three matter:
 *
 *  - The feature flag, so a local run or a preview deploy never pollutes real
 *    numbers.
 *  - `navigator.webdriver`, which is set by Playwright, Puppeteer and
 *    Lighthouse. Without this, every CI run and every performance audit files
 *    itself as a visitor who bounced, and the conversion rate drifts down for
 *    reasons nobody can find.
 *  - `/admin`, because the shop owner reading the dashboard is not a customer,
 *    and counting them makes the funnel a mirror.
 */
export function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'true') return false;
  if (navigator.webdriver) return false;
  if (window.location.pathname.startsWith('/admin')) return false;

  return true;
}

/**
 * Sends the non-PII browser copy of a funnel event to Meta Pixel.
 *
 * Meta and the first-party funnel intentionally have independent switches:
 * internal reporting may be disabled on a preview while an advertising Pixel
 * remains configured, and an ad blocker must not prevent the first-party
 * event from being queued. Incomplete payloads still go to the first-party
 * funnel, but are not useful standard commerce events for Meta.
 */
function trackMetaFunnelEvent(name: EventName, payload: EventPayload): void {
  switch (name) {
    case 'PageView':
      trackMetaPageView();
      return;

    case 'ViewContent':
      if (!payload.productId || !payload.productName || typeof payload.value !== 'number') return;
      trackMetaViewContent({
        productId: payload.productId,
        productName: payload.productName,
        value: payload.value,
      });
      return;

    case 'AddToCart':
      if (
        !payload.productId ||
        !payload.productName ||
        typeof payload.quantity !== 'number' ||
        typeof payload.value !== 'number'
      ) return;
      trackMetaAddToCart({
        productId: payload.productId,
        productName: payload.productName,
        variantName: payload.variantName,
        quantity: payload.quantity,
        value: payload.value,
      });
      return;

    case 'InitiateCheckout':
      if (typeof payload.itemCount !== 'number' || typeof payload.value !== 'number') return;
      trackMetaInitiateCheckout({ itemCount: payload.itemCount, value: payload.value });
      return;

    // A purchase is recorded on the server. Its browser Pixel copy is emitted
    // only by the thank-you page, where the confirmed order and an idempotency
    // key are both available.
    case 'Purchase':
      return;
  }
}

/**
 * Queues an event. Returns its `eventId`, so a pixel can be fired with the same
 * one and the two copies deduplicate instead of double-counting.
 */
export function track(name: EventName, payload: EventPayload = {}): string | null {
  trackMetaFunnelEvent(name, payload);

  if (!isEnabled()) return null;

  const eventId = newUuid();
  queue.push({ name, sessionId: getSessionId(), eventId, payload });

  // A full batch goes now rather than waiting out the timer.
  if (queue.length >= MAX_EVENTS_PER_REQUEST / 2) {
    void flush();
  } else {
    startTimer();
  }

  return eventId;
}

function startTimer() {
  if (flushTimer || typeof window === 'undefined') return;

  flushTimer = setInterval(() => {
    if (queue.length === 0) {
      stopTimer();
      return;
    }
    void flush();
  }, FLUSH_INTERVAL_MS);
}

function stopTimer() {
  if (!flushTimer) return;
  clearInterval(flushTimer);
  flushTimer = null;
}

/**
 * Sends whatever is queued.
 *
 * The queue is emptied BEFORE the request, not after. If the send fails the
 * events are lost — deliberately. Putting them back would mean an offline
 * visitor accumulates an unbounded queue and then posts a burst of stale events
 * on reconnect, and a funnel is a statistical instrument: a few lost page views
 * cost nothing, while a retry storm costs invocations and skews timing.
 *
 * Purchases are the exception that proves it, which is exactly why they are
 * written server-side and never depend on this path.
 */
export async function flush(): Promise<void> {
  if (queue.length === 0) return;

  const events = queue.splice(0, MAX_EVENTS_PER_REQUEST);
  if (queue.length === 0) stopTimer();

  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // Measurement must never surface as an error on the page being measured.
  }
}

/**
 * Sends the queue on the way out, with `sendBeacon`.
 *
 * A normal `fetch` is cancelled when the page unloads, which loses precisely
 * the last event of every session — the one that says where people leave. That
 * is the single most valuable event in a funnel, so it gets the API designed
 * for it: the browser takes the payload and delivers it after the page is gone.
 */
export function flushOnHide(): void {
  if (queue.length === 0) return;

  const events = queue.splice(0, MAX_EVENTS_PER_REQUEST);
  stopTimer();

  try {
    const body = JSON.stringify({ events });

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }

    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Nothing to be done on the way out.
  }
}

/** Test seam — the module holds state between tests otherwise. */
export function __resetForTests(): void {
  queue = [];
  stopTimer();
  memorySessionId = null;
}

/** Test seam — asserting on the queue beats asserting on a mocked timer. */
export function __queueSize(): number {
  return queue.length;
}
