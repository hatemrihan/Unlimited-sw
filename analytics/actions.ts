import { unstable_cache } from 'next/cache';
import { FUNNEL_STAGES, type EventName } from './events';
import { funnelAggregate, SHOP_TIMEZONE } from './queries';

/**
 * Shapes the raw aggregate into the report the dashboard draws.
 *
 * Everything here is arithmetic on small arrays — no database access, so the
 * rules below can be read, argued with and tested without a Mongo instance.
 * `queries.ts` stays the only file that knows where the data lives.
 */

export interface FunnelStage {
  name: EventName;
  /** Arabic label for the dashboard, which is Arabic-first. */
  label: string;
  sessions: number;
  /** Share of the FIRST stage — how much of the top of the funnel got here. */
  percentOfTop: number;
  /** Share lost between the previous stage and this one. */
  dropOff: number;
}

export interface AbandonedProduct {
  productId: string;
  productName: string;
  sessions: number;
}

export interface FunnelReport {
  funnel: FunnelStage[];
  totalEvents: number;
  totalRevenue: number;
  orders: number;
  averageOrderValue: number;
  cartAbandonmentRate: number;
  checkoutAbandonmentRate: number;
  conversionRate: number;
  topAbandoned: AbandonedProduct[];
  dailyChart: Array<{ day: string } & Partial<Record<EventName, number>>>;
  period: string;
  timezone: string;
}

/** The dashboard is Arabic-first, so the funnel speaks the same language as the rest of it. */
const STAGE_LABELS: Record<EventName, string> = {
  PageView: 'زيارة الموقع',
  ViewContent: 'مشاهدة منتج',
  AddToCart: 'إضافة للسلة',
  InitiateCheckout: 'بدء الدفع',
  Purchase: 'إتمام الشراء',
};

/**
 * A percentage, rounded to one decimal, that is never `NaN` or `Infinity`.
 *
 * Division by zero is the normal case on day one and after a quiet week — an
 * empty funnel is a real state, not an error — and `0/0` rendering as "NaN%" on
 * the owner's dashboard reads as a broken page rather than as no data yet.
 */
function percent(part: number, whole: number): number {
  if (!whole || !Number.isFinite(whole) || !Number.isFinite(part)) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/**
 * Builds the report for the last `days` days.
 *
 * Cached for 60 seconds. An admin watching a campaign refreshes far more often
 * than the numbers meaningfully change, and every refresh is a six-pass
 * aggregation; the report does not need to be live to the second, and saying so
 * once here is cheaper than saying it in six places.
 */
export const getFunnelReport = (days: number): Promise<FunnelReport> =>
  unstable_cache(
    async () => buildFunnelReport(days),
    ['analytics:funnel', String(days)],
    { tags: ['analytics:funnel'], revalidate: 60 }
  )();

export async function buildFunnelReport(days: number): Promise<FunnelReport> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const aggregate = await funnelAggregate(since);

  const sessionsByStage = new Map(aggregate.stages.map(stage => [stage.name, stage.sessions]));
  const sessionsFor = (name: EventName) => sessionsByStage.get(name) ?? 0;

  const top = sessionsFor(FUNNEL_STAGES[0]);

  const funnel: FunnelStage[] = FUNNEL_STAGES.map((name, index) => {
    const sessions = sessionsFor(name);
    const previous = index === 0 ? sessions : sessionsFor(FUNNEL_STAGES[index - 1]);

    return {
      name,
      label: STAGE_LABELS[name],
      sessions,
      percentOfTop: percent(sessions, top),
      dropOff: index === 0 ? 0 : percent(previous - sessions, previous),
    };
  });

  const addedToCart = sessionsFor('AddToCart');
  const startedCheckout = sessionsFor('InitiateCheckout');
  const purchased = sessionsFor('Purchase');

  // Which baskets were never bought.
  //
  // A Set rather than `.includes()` inside a loop: the two lists are the largest
  // things in the aggregate, and an accidental O(n²) here is the difference
  // between a dashboard that loads and one that times out on the busiest month
  // of the year — which is precisely when someone opens it.
  const boughtSessions = new Set(aggregate.purchasedSessions);
  const abandonedByProduct = new Map<string, AbandonedProduct>();

  for (const line of aggregate.carts) {
    if (boughtSessions.has(line.sessionId)) continue;

    const existing = abandonedByProduct.get(line.productId);
    if (existing) {
      existing.sessions += 1;
    } else {
      abandonedByProduct.set(line.productId, {
        productId: line.productId,
        productName: line.productName || 'منتج',
        sessions: 1,
      });
    }
  }

  const topAbandoned = [...abandonedByProduct.values()]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  // Daily rows, one per Cairo calendar day, with a column per stage.
  const byDay = new Map<string, { day: string } & Partial<Record<EventName, number>>>();
  for (const row of aggregate.daily) {
    const day = byDay.get(row.day) ?? { day: row.day };
    day[row.name as EventName] = row.count;
    byDay.set(row.day, day);
  }

  return {
    funnel,
    totalEvents: aggregate.totalEvents,
    totalRevenue: Math.round(aggregate.revenue.total),
    orders: aggregate.revenue.orders,
    averageOrderValue: aggregate.revenue.orders
      ? Math.round(aggregate.revenue.total / aggregate.revenue.orders)
      : 0,

    // Of the people who filled a basket, how many never started checkout.
    cartAbandonmentRate: percent(addedToCart - startedCheckout, addedToCart),

    // Of the people who started checkout, how many never finished. This is the
    // expensive one: they had their address half typed.
    checkoutAbandonmentRate: percent(startedCheckout - purchased, startedCheckout),

    // Visitors to buyers, which is the number anyone actually means by
    // "conversion rate".
    conversionRate: percent(purchased, top),

    topAbandoned,
    dailyChart: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
    period: `${days}d`,
    timezone: SHOP_TIMEZONE,
  };
}
