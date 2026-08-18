import dbConnect from '../lib/mongodb';
import AnalyticsEvent from './model';
import type { AnalyticsEventInput } from './events';

/**
 * THE ONLY FILE IN THIS FEATURE THAT TOUCHES MONGODB.
 *
 * Same rule as `product/queries.ts` and `order/queries.ts`, and it matters more
 * here than anywhere: this feature is explicitly on its way to Supabase. When
 * that day comes, this file is rewritten against Postgres and nothing else in
 * `analytics/` changes — the routes, the report shaping, the page and the
 * tracker never learn which database they are talking to.
 *
 * The SQL that replaces it is written down in analytics/README.md, so nobody
 * has to rediscover the mapping under time pressure.
 */

/**
 * The timezone the shop lives in.
 *
 * Named explicitly in every date bucket, and this is not fussiness. Cairo is
 * UTC+2 (+3 in summer), so bucketing in UTC puts an order placed at 00:30 Cairo
 * on the previous day's bar. The owner looks at yesterday's sales, sees a
 * number that does not match what they remember, and stops trusting the report
 * — which is a worse outcome than having no report. This project has already
 * fixed this exact bug once, in the promo date handling.
 */
export const SHOP_TIMEZONE = 'Africa/Cairo';

/** One row per funnel stage: how many distinct sessions reached it. */
export interface StageCount {
  name: string;
  sessions: number;
}

/** One (day, stage) bucket, the day being a Cairo calendar date. */
export interface DailyCount {
  day: string;
  name: string;
  count: number;
}

/** One product somebody put in a basket, and the session that did it. */
export interface CartLine {
  sessionId: string;
  productId: string;
  productName: string;
}

export interface FunnelAggregate {
  stages: StageCount[];
  daily: DailyCount[];
  revenue: { total: number; orders: number };
  totalEvents: number;
  /** Sessions that bought. Used to subtract from `carts` — see actions.ts. */
  purchasedSessions: string[];
  carts: CartLine[];
}

export interface InsertResult {
  /** Rows that were new and are now stored. */
  accepted: number;
  /** Rows refused by the unique index — a retry, a double `sendBeacon`, a replay. */
  duplicates: number;
}

/**
 * Writes a batch of events, tolerating the ones that were already written.
 *
 * `ordered: false` is doing real work here. Ordered inserts stop at the first
 * error, so ONE duplicate in a batch of ten would silently discard the nine
 * behind it. Unordered attempts every row and reports the failures, which is
 * exactly the semantics a retried batch needs: the new events land, the
 * already-seen ones bounce off the index, and nothing is counted twice.
 *
 * Never throws for duplicates. A tracker that retries must not be answered with
 * an error it will retry again.
 */
export async function insertEvents(events: AnalyticsEventInput[]): Promise<InsertResult> {
  if (events.length === 0) return { accepted: 0, duplicates: 0 };

  await dbConnect();

  // Rebuilt field by field, with our own clock, rather than handed through.
  //
  // The zod layer already strips anything not on the allowlist, so nothing
  // untoward should reach here — but this function is the seam, and a seam that
  // only holds because its callers are careful is not a seam. A `createdAt`
  // from anywhere else would silently place events on the wrong day, and a
  // wrong day in the funnel is the kind of error nobody notices for months.
  const now = new Date();
  const rows = events.map(event => ({
    name: event.name,
    sessionId: event.sessionId,
    eventId: event.eventId,
    payload: event.payload ?? {},
    createdAt: now,
  }));

  try {
    const inserted = await AnalyticsEvent.insertMany(rows, { ordered: false });
    return { accepted: inserted.length, duplicates: 0 };
  } catch (error: any) {
    // A bulk write that partially succeeded reports itself as an error. The
    // rows that landed are still landed; `insertedDocs` is how many.
    if (error?.code === 11000 || error?.writeErrors) {
      const writeErrors = error.writeErrors ?? [];
      const duplicates = writeErrors.filter((e: any) => (e.code ?? e.err?.code) === 11000).length;
      const accepted = error.insertedDocs?.length ?? Math.max(0, events.length - writeErrors.length);

      // Anything that failed for a reason OTHER than "already have it" is a
      // real problem and must not be swallowed into a duplicate count.
      const unexpected = writeErrors.length - duplicates;
      if (unexpected > 0) {
        console.error(`[analytics] ${unexpected} event(s) failed to write for reasons other than duplication.`);
      }

      return { accepted, duplicates };
    }

    throw error;
  }
}

/**
 * Everything the funnel report needs, in ONE round trip.
 *
 * The implementation this was ported from read whole tables into the
 * application — every PageView row, every AddToCart row — and counted them in
 * JavaScript. At a few thousand visitors that is hundreds of thousands of
 * documents crossing the wire on every dashboard load, and it gets worse
 * exactly as the shop succeeds. `$facet` runs all six passes over the same
 * already-filtered, already-indexed set and returns only the counts.
 *
 * `$match` is first and alone, so the `{ name, createdAt }` index does the
 * narrowing before any grouping starts.
 *
 * ## The one thing here that does not scale forever
 *
 * `carts` and `purchasedSessions` come back as lists so the anti-join — which
 * baskets were never bought — can happen in `actions.ts`. Their size grows with
 * traffic rather than with the size of the answer: roughly one row per distinct
 * (session, product) basket line in the period.
 *
 * At this shop's volume that is thousands of rows and entirely fine. If it ever
 * reaches the high tens of thousands, the fix is to move the anti-join into the
 * pipeline with a `$lookup` against the purchased sessions rather than to shard
 * anything — noted here so that day starts from the answer instead of from a
 * profiler.
 */
export async function funnelAggregate(since: Date): Promise<FunnelAggregate> {
  await dbConnect();

  const [result] = await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $facet: {
        // Distinct SESSIONS per stage, not raw events. Someone who reloads a
        // product page four times considered one product once; counting events
        // here would make every rate below meaningless.
        stages: [
          { $group: { _id: { name: '$name', sessionId: '$sessionId' } } },
          { $group: { _id: '$_id.name', sessions: { $sum: 1 } } },
          { $project: { _id: 0, name: '$_id', sessions: 1 } },
        ],

        daily: [
          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt',
                    timezone: SHOP_TIMEZONE,
                  },
                },
                name: '$name',
              },
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, day: '$_id.day', name: '$_id.name', count: 1 } },
          { $sort: { day: 1 } },
        ],

        revenue: [
          { $match: { name: 'Purchase' } },
          { $group: { _id: null, total: { $sum: '$payload.value' }, orders: { $sum: 1 } } },
        ],

        totalEvents: [{ $count: 'n' }],

        purchasedSessions: [
          { $match: { name: 'Purchase' } },
          { $group: { _id: '$sessionId' } },
        ],

        // One row per basket line, not per add: adding the same product twice
        // is one abandoned product, not two.
        carts: [
          { $match: { name: 'AddToCart' } },
          {
            $group: {
              _id: { sessionId: '$sessionId', productId: '$payload.productId' },
              productName: { $first: '$payload.productName' },
            },
          },
          {
            $project: {
              _id: 0,
              sessionId: '$_id.sessionId',
              productId: '$_id.productId',
              productName: 1,
            },
          },
        ],
      },
    },
  ]);

  return {
    stages: result?.stages ?? [],
    daily: result?.daily ?? [],
    revenue: {
      total: result?.revenue?.[0]?.total ?? 0,
      orders: result?.revenue?.[0]?.orders ?? 0,
    },
    totalEvents: result?.totalEvents?.[0]?.n ?? 0,
    purchasedSessions: (result?.purchasedSessions ?? []).map((row: { _id: string }) => row._id),
    carts: (result?.carts ?? []).filter((row: CartLine) => Boolean(row.productId)),
  };
}
