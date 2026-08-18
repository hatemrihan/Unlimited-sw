/**
 * @jest-environment node
 *
 * What the public analytics endpoint will accept.
 *
 * `/api/analytics/events` has to be open: the visitors it measures have no
 * account and never will. So this schema is the only thing between the
 * collection and whatever anyone chooses to POST at it.
 *
 * The property worth protecting is not "valid data" — it is that the shape
 * makes personal data impossible to store. There is no field for an email, a
 * phone, a name or an address, so a well-meaning `track()` call cannot add one
 * and a malicious one cannot either. That is what keeps this collection
 * uninteresting to leak and simple to answer for.
 */
import { ingestEventsSchema, analyticsEventSchema } from '../analytics/schema';
import { MAX_EVENTS_PER_REQUEST, FUNNEL_STAGES } from '../analytics/events';

const SESSION = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const EVENT = '5c9d1e70-4f89-11d3-9a0c-0305e82c3302';

function event(overrides: Record<string, unknown> = {}) {
  return { name: 'PageView', sessionId: SESSION, eventId: EVENT, payload: { path: '/shop' }, ...overrides };
}

describe('a single event', () => {
  it.each(FUNNEL_STAGES)('accepts the funnel stage %s', name => {
    expect(analyticsEventSchema.safeParse(event({ name })).success).toBe(true);
  });

  it('refuses an event name it does not know', () => {
    // Not pedantry: an unrecognised name would sit in the collection forever,
    // counted by nothing and explaining nothing.
    expect(analyticsEventSchema.safeParse(event({ name: 'Checkout' })).success).toBe(false);
    expect(analyticsEventSchema.safeParse(event({ name: '' })).success).toBe(false);
  });

  it('requires both ids to be UUIDs', () => {
    // eventId is what the unique index dedups on. A caller-chosen string could
    // collide by accident and silently drop somebody else's event.
    expect(analyticsEventSchema.safeParse(event({ eventId: 'abc' })).success).toBe(false);
    expect(analyticsEventSchema.safeParse(event({ sessionId: '1' })).success).toBe(false);
    expect(analyticsEventSchema.safeParse(event({ sessionId: undefined })).success).toBe(false);
  });

  it('defaults an absent payload to an empty object', () => {
    const result = analyticsEventSchema.safeParse(event({ payload: undefined }));

    expect(result.success).toBe(true);
    expect(result.success && result.data.payload).toEqual({});
  });
});

describe('the payload allowlist', () => {
  it('keeps the keys the funnel actually uses', () => {
    const result = analyticsEventSchema.safeParse(
      event({
        name: 'AddToCart',
        payload: {
          productId: 'p1',
          productName: 'Hoodie',
          variantName: 'Black',
          quantity: 2,
          value: 500,
          currency: 'EGP',
          source: 'client',
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.success && result.data.payload.productName).toBe('Hoodie');
  });

  it('strips anything personal rather than storing it', () => {
    // The whole point. Someone adds `email` to a track() call in good faith;
    // it must not reach the database.
    const result = analyticsEventSchema.safeParse(
      event({
        payload: {
          path: '/checkout',
          email: 'customer@example.com',
          phone: '+201234567890',
          name: 'A Customer',
          address: '12 Somewhere St',
          ip: '41.44.1.2',
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.success && result.data.payload).toEqual({ path: '/checkout' });
  });

  it('refuses numbers that would poison a total', () => {
    // Infinity and NaN survive JSON.parse, and one of either turns a period's
    // revenue into nonsense for every report that reads it.
    expect(analyticsEventSchema.safeParse(event({ payload: { value: Infinity } })).success).toBe(false);
    expect(analyticsEventSchema.safeParse(event({ payload: { value: NaN } })).success).toBe(false);
    expect(analyticsEventSchema.safeParse(event({ payload: { value: -100 } })).success).toBe(false);
    expect(analyticsEventSchema.safeParse(event({ payload: { quantity: -1 } })).success).toBe(false);
  });

  it('bounds free text instead of storing whatever arrives', () => {
    const long = 'x'.repeat(201);

    expect(analyticsEventSchema.safeParse(event({ payload: { path: long } })).success).toBe(false);
    expect(analyticsEventSchema.safeParse(event({ payload: { productName: long } })).success).toBe(false);
  });

  it('accepts only EGP, so totals never mix currencies', () => {
    expect(analyticsEventSchema.safeParse(event({ payload: { currency: 'USD' } })).success).toBe(false);
    expect(analyticsEventSchema.safeParse(event({ payload: { currency: 'EGP' } })).success).toBe(true);
  });
});

describe('a batch', () => {
  it('accepts a normal batch', () => {
    const events = [event(), event({ eventId: '7a1b2c30-4f89-11d3-9a0c-0305e82c3303', name: 'ViewContent' })];

    expect(ingestEventsSchema.safeParse({ events }).success).toBe(true);
  });

  it('refuses an empty one', () => {
    expect(ingestEventsSchema.safeParse({ events: [] }).success).toBe(false);
  });

  it('refuses more than the cap', () => {
    // "Batch your events" and "send your whole day in one request" are
    // different things, and only one of them is the design.
    const tooMany = Array.from({ length: MAX_EVENTS_PER_REQUEST + 1 }, () => event());

    expect(ingestEventsSchema.safeParse({ events: tooMany }).success).toBe(false);
  });

  it('refuses a batch containing one bad event', () => {
    // All or nothing: accepting the good half of a malformed batch hides the
    // bug from whoever sent it.
    expect(ingestEventsSchema.safeParse({ events: [event(), event({ name: 'Nope' })] }).success).toBe(false);
  });

  it('refuses a body that is not a batch at all', () => {
    expect(ingestEventsSchema.safeParse({}).success).toBe(false);
    expect(ingestEventsSchema.safeParse({ events: 'PageView' }).success).toBe(false);
    expect(ingestEventsSchema.safeParse(null).success).toBe(false);
  });
});
