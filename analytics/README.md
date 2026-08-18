# analytics/

The conversion funnel: how many people saw the shop, how many reached checkout,
how many bought, and where the rest went.

Built on MongoDB **on the way to Supabase**. That is not a vague intention — it
is the reason the folder is shaped the way it is, and §4 is the migration.

## Layering

```
route / page  →  actions.ts  →  queries.ts  →  MongoDB
client/track.ts  →  POST /api/analytics/events  →  schema.ts  →  queries.ts
```

Same rule as `product/` and `order/`:

> **Nothing outside `analytics/queries.ts` may import `analytics/model.ts`.**

Everything else — the routes, the report shaping, the admin page, the browser
tracker — is database-agnostic. When Supabase arrives, `queries.ts` is rewritten
and nothing else moves.

## 1. The event contract

Five stages, in `events.ts`, in order:

| Event | Fired | By |
|---|---|---|
| `PageView` | every route change | browser |
| `ViewContent` | product page mount | browser |
| `AddToCart` | `addItem` actually added (not when stock refused it) | browser |
| `InitiateCheckout` | checkout page mount with a non-empty cart | browser |
| `Purchase` | the order transaction commits | **server** |

The names are Meta's, and that is deliberate: they map one-to-one onto Meta
Pixel and GA4 (`page_view`, `view_item`, `add_to_cart`, `begin_checkout`,
`purchase`). Inventing our own would buy a translation layer the day a pixel is
added, and translation layers are where funnels quietly stop agreeing with the
ad platform you are paying.

**Purchase is written server-side on purpose.** Client-side purchase events are
lost to ad-blockers, closed tabs and slow phones — exactly the traffic that
matters most for a store on Egyptian mobile data. The order transaction is the
authoritative moment and it is already ours, so revenue comes from there.
`eventId` is `purchase:<orderId>`, so a retried order can never count twice.

## 2. Privacy — what is deliberately not here

No IP address. No user-agent. No email, phone, name or address. No customer
object from the order.

This is enforced by shape, not by discipline: `schema.ts` is an allowlist and
`payload` has no field for any of it, so a well-meaning `track()` call cannot
add one and a hostile POST cannot either. See `__tests__/analytics-schema.test.ts`,
which pins it.

The consequence is that this collection is uninteresting to leak and simple to
answer for. Keep it that way — adding a "just the email, for support" field is
how that ends.

## 3. Cost, and why events are batched

Every request is a Netlify function invocation. Eight thousand visitors at six
page views each is ~50,000 invocations a day for page views alone.

`client/track.ts` queues events and flushes on whichever comes first: 5 seconds,
10 queued events, or `pagehide` via `navigator.sendBeacon`. Most sessions send
one to three requests in total.

This is the same cost problem the storefront session polling had. We removed
that one; we are not adding another.

Retention is 180 days, enforced by a TTL index — MongoDB deletes old events on
its own and nothing has to run. Raw events are worth reading for weeks, not
years, and this is the fastest-growing collection in the system.

## 4. Reading the funnel

`GET /api/admin/funnel?period=7d|30d|90d` → `actions.getFunnelReport(days)` →
one `queries.funnelAggregate(since)`.

That aggregation is a single `$facet` doing six passes over one already-indexed
`$match`. The implementation this was ported from read whole tables into the
application and counted in JavaScript; at a few thousand visitors that is
hundreds of thousands of documents per dashboard load, and it gets worse exactly
as the shop succeeds.

**Every stage number is a count of distinct SESSIONS, not events.** Someone who
reloads a product page four times considered one product once. Counting events
would make every rate in the report meaningless, and the two are
indistinguishable on screen.

Cached 60 seconds. An admin watching a campaign refreshes far more often than
the numbers meaningfully change. The cache is TTL-only — nothing purges the
`analytics:funnel` tag, and nothing should: a funnel that is a minute stale is
correct, and purging it on every event write would defeat the point.

**Known scaling limit, written down deliberately:** `carts` and
`purchasedSessions` come back as lists so the anti-join (which baskets were never
bought) happens in `actions.ts`. Their size grows with traffic rather than with
the size of the answer. At this shop's volume that is thousands of rows and
fine. Past the high tens of thousands, move the anti-join into the pipeline with
a `$lookup` — the fix is known, so that day starts from the answer rather than
from a profiler.

## 5. Moving to Supabase

Only `queries.ts` changes. The table:

```sql
create table analytics_events (
  id          bigserial primary key,
  name        text not null check (name in ('PageView','ViewContent','AddToCart','InitiateCheckout','Purchase')),
  session_id  text not null,
  event_id    text not null unique,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index on analytics_events (name, created_at desc);
create index on analytics_events (session_id, created_at desc);

-- Retention, replacing the Mongo TTL index:
-- select cron.schedule('purge-analytics', '0 3 * * *',
--   $$delete from analytics_events where created_at < now() - interval '180 days'$$);
```

`insertEvents` becomes an upsert:

```sql
insert into analytics_events (name, session_id, event_id, payload)
values (...)
on conflict (event_id) do nothing;
```

`on conflict do nothing` is the Postgres spelling of `insertMany({ordered: false})`
swallowing E11000 — same semantics, same reason.

The funnel aggregation becomes one statement:

```sql
select name, count(distinct session_id) as sessions
from analytics_events
where created_at >= now() - interval '30 days'
group by name;
```

and the daily buckets:

```sql
select date_trunc('day', created_at at time zone 'Africa/Cairo') as day, name, count(*)
from analytics_events
where created_at >= ...
group by 1, 2;
```

**Do not lose the time zone.** Cairo is UTC+2/+3. Bucketing in UTC puts a sale at
00:30 Cairo on the previous day's bar — the same bug that was fixed once already
in the promo date handling. Both the Mongo `$dateToString` and the SQL above name
`Africa/Cairo` explicitly for that reason.

Data migration: there is little worth moving. With 180-day retention, starting
fresh costs one reporting period.
