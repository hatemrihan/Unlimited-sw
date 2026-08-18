import { insertEvents } from './queries';

/**
 * Records a Purchase, from the server, once an order has actually committed.
 *
 * ## Why this is not a browser event
 *
 * Every other stage of the funnel is reported by the browser, and losing some
 * of those costs nothing — a page view is one sample among thousands. Purchase
 * is different in kind: it is money, it is the denominator of every rate in the
 * report, and each one is irreplaceable.
 *
 * Client-side purchase events are lost to ad-blockers, to a customer closing
 * the tab on the thank-you page before a request completes, and to slow
 * connections — which is to say they are lost disproportionately among exactly
 * the traffic this shop runs on. A funnel whose conversion rate is quietly
 * understated by a third is worse than no funnel, because decisions get made
 * on it.
 *
 * The order transaction is the authoritative moment and it is already ours, so
 * revenue is read from there.
 *
 * ## Two ids, and why neither is a UUID
 *
 * `analytics/schema.ts` demands UUIDs, but that schema guards the PUBLIC ingest
 * endpoint, where ids arrive from strangers and must be unguessable and
 * collision-free. This path does not go through it — the server writes straight
 * to `queries.insertEvents` — so the ids here are chosen for a different and
 * better property: they are DERIVED, which makes them idempotent.
 *
 * `eventId = purchase:<orderId>` means the unique index refuses a second write
 * for the same order no matter how it arrives — a retried request, a duplicate
 * checkout answered from the idempotency guard, or someone replaying a webhook
 * in a year's time. Revenue cannot be double-counted, structurally, rather than
 * because every call site remembers to check.
 */
export async function recordPurchase(order: {
  orderId: string;
  totalAmount: number;
  products?: Array<{ quantity: number }>;
}, sessionId?: string): Promise<void> {
  const itemCount = (order.products ?? []).reduce((sum, line) => sum + (line.quantity || 0), 0);

  await insertEvents([
    {
      name: 'Purchase',
      // A customer with storage blocked has no session. Recording the purchase
      // against the order itself keeps revenue right and loses only the join
      // back to their browsing — the honest trade, made explicit.
      sessionId: sessionId || `server:${order.orderId}`,
      eventId: `purchase:${order.orderId}`,
      payload: {
        orderId: order.orderId,
        value: order.totalAmount,
        itemCount,
        currency: 'EGP',
        source: 'server',
      },
    },
  ]);
}
