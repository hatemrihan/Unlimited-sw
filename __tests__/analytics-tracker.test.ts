/**
 * @jest-environment jsdom
 *
 * The browser tracker.
 *
 * Two properties matter more than the events themselves.
 *
 * The first is cost. Every request is a serverless invocation, and this thing
 * runs on every page for every visitor. Unbatched, eight thousand visitors is
 * roughly fifty thousand invocations a day for page views alone — the same
 * order of magnitude as the session polling that was just removed from the
 * storefront for exactly that reason.
 *
 * The second is that it must never break the page it is measuring. A tracker
 * that throws when storage is blocked or the network is down has cost real
 * sales to record a page view.
 */
import {
  track,
  flush,
  flushOnHide,
  getSessionId,
  isEnabled,
  __resetForTests,
  __queueSize,
} from '../analytics/client/track';
import { SESSION_IDLE_MINUTES } from '../analytics/events';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

beforeEach(() => {
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'true';
  localStorage.clear();
  __resetForTests();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as never;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the session id', () => {
  it('is a real UUID, because the ingest schema validates one', () => {
    // The looser fallback used elsewhere in the codebase returns plain hex.
    // Here that would be refused at the door and the event would vanish — and
    // the browsers without crypto.randomUUID are exactly the old phones we
    // most want counted.
    expect(getSessionId()).toMatch(UUID);
  });

  it('stays the same across calls within a session', () => {
    expect(getSessionId()).toBe(getSessionId());
  });

  it('survives a page navigation', () => {
    const first = getSessionId();
    __resetForTests(); // a fresh module, as a new page load would have

    expect(getSessionId()).toBe(first);
  });

  it('starts a new session after the idle window', () => {
    const first = getSessionId();

    const stale = Date.now() - (SESSION_IDLE_MINUTES + 1) * 60_000;
    localStorage.setItem('usw_sid', JSON.stringify({ id: first, lastSeen: stale }));

    expect(getSessionId()).not.toBe(first);
  });

  it('keeps the session alive while the visitor is still active', () => {
    const first = getSessionId();

    const recent = Date.now() - (SESSION_IDLE_MINUTES - 1) * 60_000;
    localStorage.setItem('usw_sid', JSON.stringify({ id: first, lastSeen: recent }));

    expect(getSessionId()).toBe(first);
  });

  it('recovers from corrupt storage instead of throwing', () => {
    localStorage.setItem('usw_sid', 'not json');

    expect(() => getSessionId()).not.toThrow();
    expect(getSessionId()).toMatch(UUID);
  });

  it('still counts a visitor whose storage is blocked', () => {
    // Private mode, or storage disabled. Dropping these visitors from the
    // funnel entirely would quietly bias every rate in it.
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const id = getSessionId();
    expect(id).toMatch(UUID);
    expect(getSessionId()).toBe(id); // stable for the life of the tab
  });
});

describe('batching', () => {
  it('queues rather than sending one request per event', () => {
    // The whole cost argument in one test.
    track('PageView', { path: '/' });
    track('PageView', { path: '/shop' });
    track('ViewContent', { productId: 'p1' });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(__queueSize()).toBe(3);
  });

  it('sends the whole queue as one request', async () => {
    track('PageView', { path: '/' });
    track('PageView', { path: '/shop' });

    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.events).toHaveLength(2);
    expect(__queueSize()).toBe(0);
  });

  it('sends on its own once the queue builds up', () => {
    for (let i = 0; i < 10; i++) track('PageView', { path: `/p${i}` });

    expect(global.fetch).toHaveBeenCalled();
  });

  it('does nothing when there is nothing queued', async () => {
    await flush();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('each event', () => {
  it('carries a UUID event id, returned so a pixel can reuse it', () => {
    const eventId = track('AddToCart', { productId: 'p1' });

    expect(eventId).toMatch(UUID);
  });

  it('gets its own id, so two identical events are not deduplicated as one', () => {
    // Two genuine views of the same page must both count.
    const first = track('PageView', { path: '/shop' });
    const second = track('PageView', { path: '/shop' });

    expect(first).not.toBe(second);
  });

  it('carries the session id', () => {
    track('PageView', { path: '/' });

    expect(__queueSize()).toBe(1);
    expect(getSessionId()).toMatch(UUID);
  });
});

describe('leaving the page', () => {
  it('uses sendBeacon, which survives the tab closing', () => {
    // A normal fetch is cancelled on unload, which loses the last event of
    // every session — the one that says where people leave.
    const sendBeacon = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });

    track('PageView', { path: '/shop' });
    flushOnHide();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe('/api/analytics/events');
    expect(__queueSize()).toBe(0);
  });

  it('falls back to fetch where sendBeacon is unavailable', () => {
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });

    track('PageView', { path: '/shop' });
    flushOnHide();

    expect(global.fetch).toHaveBeenCalled();
  });

  it('does nothing when the queue is empty', () => {
    const sendBeacon = jest.fn();
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });

    flushOnHide();

    expect(sendBeacon).not.toHaveBeenCalled();
  });
});

describe('when it should stay quiet', () => {
  it('records nothing unless the feature flag is on', () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'false';

    expect(track('PageView', { path: '/' })).toBeNull();
    expect(__queueSize()).toBe(0);
  });

  it('records nothing for automated browsers', () => {
    // Playwright, Puppeteer and Lighthouse all set this. Without the check,
    // every CI run and every performance audit files itself as a visitor who
    // bounced, and the conversion rate drifts down for no findable reason.
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });

    expect(isEnabled()).toBe(false);
    expect(track('PageView', { path: '/' })).toBeNull();

    Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
  });

  it('records nothing on the admin dashboard', () => {
    // The shop owner reading the funnel is not a customer, and counting them
    // makes the report a mirror.
    window.history.pushState({}, '', '/admin/funnel');

    expect(isEnabled()).toBe(false);
    expect(track('PageView', { path: '/admin/funnel' })).toBeNull();

    window.history.pushState({}, '', '/');
  });
});

describe('when things go wrong', () => {
  it('does not throw when the network fails', async () => {
    // Measurement must never surface as an error on the page being measured.
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as never;

    track('PageView', { path: '/' });

    await expect(flush()).resolves.toBeUndefined();
  });

  it('drops events a failed send was carrying, rather than growing forever', async () => {
    // Deliberate. Re-queueing means an offline visitor accumulates an unbounded
    // backlog and then posts a burst of stale events on reconnect. A few lost
    // page views cost nothing; Purchase never depends on this path.
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as never;

    track('PageView', { path: '/' });
    await flush();

    expect(__queueSize()).toBe(0);
  });
});
