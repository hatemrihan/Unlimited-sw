# Conversion Funnel — Implementation Plan (MongoDB now, Supabase later)

**Date:** 18 August 2026
**Reference:** the Supabase example you sent (`GET /api/admin/funnel` + `FunnelPage`).
**Rule for this plan:** every file, folder, function and event name below is a **proposal**.
Nothing gets written until you approve or rename them (§9 has the decision list).

---

## 0. What the reference does, and what it leaves out

The example gives us two of the four pieces:

| Piece | In the reference? | We must design it |
|---|---|---|
| Read side — aggregate events into funnel numbers | ✅ (`/api/admin/funnel`) | Port to Mongo aggregation |
| Admin page — KPIs, funnel bars, daily chart, abandoned products, integrations panel | ✅ (`FunnelPage`) | Port nearly 1:1, our styling |
| **Write side — the browser sending events** (session id, event id, batching) | ❌ | Yes — §3 |
| **Where in the store each event fires** (page view, product view, add to cart, checkout, purchase) | ❌ | Yes — §4 |
| Storage — table `analytics_events(event_name, session_id, payload, created_at, event_id)` | ✅ implied | Mongo model with same shape — §2 |

Two things in the reference I would **not** copy:

1. **It reads whole tables into memory** (every PageView row, every AddToCart row…) and counts
   in JavaScript. At 6–10k visitors that is hundreds of thousands of rows per dashboard load.
   Mongo can do all of it in **one aggregation pipeline** (`$facet`) — §5.
2. **Daily buckets are computed in UTC** (`toISOString().split('T')[0]`) — the exact bug we
   fixed in the promo date picker. Cairo is UTC+2/+3; a sale at 00:30 Cairo lands on
   yesterday's bar. We bucket in `Africa/Cairo`.

And one thing it does that we should **improve**: it counts a Purchase from a **client-side**
event. Ad-blockers, closed tabs and slow phones lose those. We already have the authoritative
moment — the order transaction commits — so Purchase is written **server-side** (§4.5), and the
client fires only the pixel copies with the same `eventId`.

---

## 1. Folder & files (follows the `product/`, `payments/`, `email/` convention)

```
analytics/                         ← new feature folder
  README.md                        layering, event contract, privacy rules, Supabase notes
  events.ts                        FUNNEL_STAGES, event names, payload types (shared client+server)
  model.ts                         Mongoose model  AnalyticsEvent  (collection: analytics_events)
  schema.ts                        zod: ingestEventsSchema (what the browser may send)
  queries.ts                       THE ONLY FILE THAT TOUCHES MONGO  — insertMany + funnel aggregation
  actions.ts                       getFunnelReport(days) → shapes queries output for the API
  session.ts                       server-side helper: read sessionId from body/header, never from IP
  client/
    track.ts                       browser tracker: getSessionId(), track(name, payload), flush(), sendBeacon
    useTrackPageView.ts            hook: fires PageView on route change
    pixels.ts                      thin fbq()/gtag() wrappers, same eventId (phase F, optional)

app/api/analytics/events/route.ts  POST  public, rate-limited, zod-validated  → queries.insertEvents
app/api/admin/funnel/route.ts      GET   requireAdmin → actions.getFunnelReport   (auto-covered by guard test)

app/admin/sections/funnel.tsx      the dashboard section (port of FunnelPage)
app/admin/funnel/page.tsx          standalone route rendering the same section (payment-settings pattern)
utils/navItems.tsx                 + "Funnel" item → /admin#funnel
app/admin/page.tsx                 + 'funnel' in validSections + <Funnel /> case

app/components/AnalyticsProvider.tsx   client component mounted in app/layout.tsx: page views + flush on pagehide

__tests__/analytics-schema.test.ts
__tests__/analytics-ingest.test.ts
__tests__/analytics-funnel.test.ts     (mongodb-memory-server — the important one)
__tests__/analytics-purchase-event.test.ts
```

Layering, same as `product/`:
```
route / page → actions → queries → MongoDB
client/track.ts → POST /api/analytics/events → schema → queries
```
When we move to Supabase, `queries.ts` is rewritten and **nothing else changes**. §8 gives the
SQL so that day is mechanical.

---

## 2. Data model — `analytics/model.ts`

Same shape as the reference table, so the Postgres version is a straight port.

```ts
{
  name:      'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  sessionId: string,          // random UUID from the browser, rotates after 30 min idle (§3)
  eventId:   string,          // UUID per event; unique index → duplicates are dropped, not double-counted
  payload:   {                // ALLOWLISTED keys only — see schema.ts
    path?:         string,    // PageView
    productId?:    string,    // ViewContent / AddToCart
    productName?:  string,
    variantName?:  string,
    quantity?:     number,
    value?:        number,    // AddToCart line value / Purchase total (EGP)
    currency?:     'EGP',
    orderId?:      string,    // Purchase only, server-written
    itemCount?:    number,    // InitiateCheckout / Purchase
    source?:       'client' | 'server'
  },
  createdAt: Date             // server clock, never the browser's
}
```

**Indexes** (created by `scripts/sync-indexes.js`, additive like the product ones):
- `{ name: 1, createdAt: -1 }` — every funnel query filters on these two
- `{ sessionId: 1, createdAt: -1 }` — abandonment join
- `{ eventId: 1 }` **unique** — dedup (retries, sendBeacon double-fires, pixel replays)
- `{ createdAt: 1 }` **TTL, `expireAfterSeconds: 180 days`** — decision D3. Raw events are
  worthless after a few months and the collection would otherwise grow forever on Atlas free/shared tiers.

**What is deliberately NOT stored:** IP address, user-agent string, email, phone, name, order
customer object. The funnel needs none of it, and not storing it means there is nothing to leak
and no GDPR/PDPL question. `session.ts` enforces this — the API never reads `x-forwarded-for`.

---

## 3. Browser tracker — `analytics/client/track.ts`

Small (~120 lines), no dependency.

| Function | Does |
|---|---|
| `getSessionId()` | `localStorage['usw_sid']` = `{ id, lastSeen }`. New UUID if missing or `lastSeen` > 30 min ago. Updates `lastSeen` on every call. Falls back to an in-memory id if storage is blocked. |
| `track(name, payload)` | Pushes `{ name, eventId: crypto.randomUUID(), sessionId, payload, ts }` onto an in-memory queue. Returns the `eventId` (so pixels can reuse it). |
| `flush()` | Sends the queue as one `POST /api/analytics/events` `{ events: [...] }`. Called: every **5 s** if non-empty, when the queue reaches **10**, and on `pagehide`/`visibilitychange:hidden` via `navigator.sendBeacon` (survives tab close). |
| `isEnabled()` | `process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'` **and** not `navigator.webdriver` (Playwright/Lighthouse bots) **and** not on `/admin/*`. |

**Why batching matters here specifically:** every request is a Netlify function invocation.
Without batching, 8k visitors × ~6 page views = ~50k invocations/day for page views alone. With
batching most sessions send 1–3 requests total. This is the same cost problem as the session
polling in the review — we should not add a new one while removing the old.

`useTrackPageView.ts`: `usePathname()` + `useEffect` → `track('PageView', { path })`. Mounted once
in `AnalyticsProvider` (in `layout.tsx`, inside `CartProvider`). Skips `/admin`.

---

## 4. Where each event fires

| Stage | Where | Payload | Notes |
|---|---|---|---|
| **PageView** | `AnalyticsProvider` on every route change | `{ path }` | Not on `/admin/*`, `/api/*` |
| **ViewContent** | `app/product/[id]/ProductClient.tsx` mount | `{ productId, productName, value: price }` | Once per mount, not per variant click |
| **AddToCart** | **`contexts/CartContext.tsx` → `addItem`**, only when the reducer actually added (this is why the review's item B3 — `addItem` returning a boolean — becomes a prerequisite) | `{ productId, productName, variantName, quantity, value: price×qty }` | One hook point covers shop grid, product page, Buy Now |
| **InitiateCheckout** | `app/checkout/page.tsx` mount when `cartItems.length > 0` | `{ itemCount, value: subtotal }` | Once per mount |
| **Purchase** | **server** — `app/api/orders/route.ts`, right after `createOrderTransaction` succeeds, before the email dispatch | `{ orderId, value: totalAmount, itemCount, currency:'EGP', source:'server' }` | `sessionId` comes from the order body (§4.5). `eventId = 'purchase:' + orderId` so a retry can never double-count |

### 4.5 Getting the session id into the Purchase event
- `checkout/page.tsx` adds `sessionId: getSessionId()` to the order payload.
- `lib/schemas/order.schema.ts` gains `sessionId: z.string().uuid().optional()`.
- The route passes it to `queries.insertEvents([...])` after commit. It is **not** stored on the
  order document (no need; keeps the order schema clean).
- If a customer has storage blocked, `sessionId` is missing → Purchase is still recorded with
  `sessionId: 'server:' + orderId` so revenue is right; only the session join misses it. That is
  the same limitation the reference has, made explicit.
- On the thank-you page the client fires the **pixel** Purchase (phase F) with
  `eventID = 'purchase:' + orderId` — Meta dedups against the server CAPI copy if we ever add it.

Nothing else in the order path changes; the write is outside the transaction and fire-and-forget
with a `.catch(log)` — an analytics failure must never fail an order.

---

## 5. Ingest — `POST /api/analytics/events`

- Body: `{ events: [{ name, eventId, sessionId, payload, ts }] }`, **max 20 events per request**,
  each validated by `ingestEventsSchema` (`analytics/schema.ts`): enum name, UUID ids,
  allowlisted payload keys, strings ≤ 200 chars, numbers finite & ≥ 0. Anything else → 400.
- Rate limit: reuse `login/rateLimit.ts` — **60 requests / 10 min / IP** (a normal session sends
  <10). Same limiter the review's Phase A adds to `/api/orders` and `/api/upload`; this is the
  third consumer, so it should become `lib/rateLimit.ts` (decision D7).
- `insertMany(events, { ordered: false })` — duplicate `eventId`s throw E11000 for those rows only;
  we swallow that and return `{ accepted, duplicates }`.
- Responds `202` in ~50 ms; no reads, no joins.
- `Cache-Control: no-store`. Not in the admin-guard list — it is public by design; add it to the
  test's **public allowlist with a written reason** ("browser telemetry, no auth possible,
  rate-limited, PII-free schema").

---

## 6. Read — `GET /api/admin/funnel?period=7d|30d|90d`

`requireAdmin()` first line (guard test covers it automatically because it lives under
`app/api/admin/`). Then `actions.getFunnelReport(days)` → **one** `queries.funnelAggregate(since)`:

```
$match  { createdAt: { $gte: since } }
$facet  {
  stages:   [ $group {_id:{name,sessionId}} → $group {_id:'$_id.name', sessions:{$sum:1}} ]
  daily:    [ $group {_id:{ day:$dateToString{format:'%Y-%m-%d', date:'$createdAt', timezone:'Africa/Cairo'}, name }, n:{$sum:1}} ]
  revenue:  [ $match {name:'Purchase'} → $group {_id:null, total:{$sum:'$payload.value'}, orders:{$sum:1}} ]
  total:    [ $count 'n' ]
  purchased:[ $match {name:'Purchase'} → $group {_id:'$sessionId'} ]
  carts:    [ $match {name:'AddToCart'} → $group {_id:{sessionId, productId:'$payload.productId'}, name:{$first:'$payload.productName'}} ]
}
```
Then in `actions.ts` (plain JS on small arrays): abandoned = `carts` whose sessionId ∉ `purchased`,
grouped by productId, top 8; rates exactly as the reference (`cartAbandonmentRate`,
`checkoutAbandonmentRate`, `conversionRate`, drop-off per stage); daily rows in Cairo dates.

Response shape = **identical to the reference** (`funnel[]`, `totalEvents`, `totalRevenue`,
`cartAbandonmentRate`, `checkoutAbandonmentRate`, `conversionRate`, `topAbandoned[]`,
`dailyChart[]`, `period`) so the page port is 1:1 and the Supabase rewrite later only touches
`queries.ts`.

Cached 60 s via `unstable_cache` tag `analytics:funnel` (admins refresh often; the numbers do
not need to be live to the second) — decision D8.

---

## 7. Admin page — `app/admin/sections/funnel.tsx`

Port of the reference `FunnelPage` with these changes:
- Styling tokens match our admin (`bg-white/[0.03]` etc. already match `app/admin/page.tsx`).
- Labels bilingual like the rest of the dashboard? The dashboard is Arabic-first
  (`قيد الانتظار`, `ج.م`) — decision D9: Arabic labels + `ج.م` for revenue.
- `TrackingStatus` panel: keep, but the third row says **"Internal Analytics (MongoDB)"** now and
  will say Supabase later; Meta/GA rows show "Not configured" until phase F.
- Empty state text: real (we will have zero events on day one).
- Registered as section `'funnel'` (hash routing in `admin/page.tsx`) + standalone
  `app/admin/funnel/page.tsx` + nav item.

---

## 8. Supabase later — what the migration will look like

Only `analytics/queries.ts` changes. For the record now, so nobody has to rediscover it:

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
-- retention: pg_cron delete where created_at < now() - interval '180 days'
```
The funnel query becomes one SQL statement with `count(distinct session_id) filter (where name=…)`
and `date_trunc('day', created_at at time zone 'Africa/Cairo')`. The `$facet` above maps to it
piece by piece. Data migration: export Mongo → CSV → `copy` (or just start fresh — 180-day
retention means there is little worth moving).

---

## 9. Decisions I need from you (before any code)

| # | Decision | My recommendation |
|---|---|---|
| D1 | Folder name `analytics/` and file names in §1 | as listed |
| D2 | Event names: keep Meta's (`PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`) | **keep** — they map 1:1 to Meta Pixel and GA4 (`page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`) which we will want later |
| D3 | Retention TTL | **180 days** |
| D4 | Session idle window | **30 min** (GA's default) |
| D5 | Batching: 5 s / 10 events / sendBeacon on hide | yes |
| D6 | Purchase written server-side (not from thank-you page) | **yes** — see §0 |
| D7 | Promote `login/rateLimit.ts` → `lib/rateLimit.ts` (three consumers: login, orders/upload, analytics) | yes, `git mv`, in the same commit as the first new consumer |
| D8 | Funnel API cached 60 s | yes |
| D9 | Arabic labels on the funnel page | yes, match dashboard |
| D10 | Meta Pixel + GA4 wrappers now or later? Needs the IDs, a CSP change (`connect.facebook.net`, `googletagmanager.com`, `google-analytics.com`), and a consent decision | **later (phase F)** — build internal funnel first, it works with zero third parties |
| D11 | Sampling? (record 1 in N page views) | **no** — volume is fine with batching; sampling breaks per-session funnels |
| D12 | Feature flag `NEXT_PUBLIC_ANALYTICS_ENABLED` | yes — off in dev/tests, on in staging/prod |

---

## 10. Build order — one commit group per phase, tests first in each

| Phase | Work | Proof |
|---|---|---|
| **A. Storage & contract** | `events.ts`, `model.ts`, `schema.ts`, `queries.insertEvents`, indexes in `sync-indexes.js`, README | `analytics-schema.test.ts`: rejects unknown event, PII keys, >20 events, non-UUID ids; accepts a valid batch. Model test: duplicate `eventId` → single row |
| **B. Ingest** | `POST /api/analytics/events`, rate limit (`lib/rateLimit.ts` move), public-allowlist entry in guard test | `analytics-ingest.test.ts`: 202 + `{accepted, duplicates}`; 400 on bad body; 429 on 61st |
| **C. Browser tracker + wiring** | `client/track.ts`, `useTrackPageView.ts`, `AnalyticsProvider` in layout, `addItem` returns boolean (review B3), hooks in ProductClient / CartContext / checkout | jsdom test for `getSessionId` rotation & queue/flush; manual: Network tab shows batched POSTs |
| **D. Server Purchase** | order schema `sessionId`, event write after commit | `analytics-purchase-event.test.ts`: committed order → exactly one Purchase row with the order total; failed transaction → zero rows; same order twice → one row |
| **E. Funnel API + page** | `queries.funnelAggregate`, `actions.getFunnelReport`, route, section, standalone page, nav | `analytics-funnel.test.ts` (memory-server): seed 3 sessions (view/cart/buy, view/cart/leave, view only) → stages 3/3/2/1/1, cart abandonment 50 %, top abandoned = the left product, an event at 00:30 Cairo lands on the right day. Guard test green. |
| **F. Pixels (optional, later)** | `client/pixels.ts`, CSP, env ids, TrackingStatus rows | manual in Meta Events Manager test-events tab |

Sizes: A+B ≈ 250 lines, C ≈ 200, D ≈ 40, E ≈ 550 (page is most of it). Fits in one branch,
after the review's Phase A blockers (promo fix, order rate limit, upload guard) — the funnel
ingest reuses that rate limiter, so A of the review goes first.

---

## 11. Risks & how the plan handles them

| Risk | Handling |
|---|---|
| Analytics failure breaks checkout | Purchase write is outside the transaction, `.catch(log)`; tracker never awaits |
| Function-invocation cost | batching + sendBeacon; no per-event calls |
| Junk data (bots, tampering) | zod allowlist, `navigator.webdriver` skip, rate limit, unique `eventId`, values clamped ≥ 0 |
| PII / legal | nothing personal stored, no IP; README states it |
| Collection growth | TTL 180 d |
| Slow dashboard | one `$facet` aggregation on indexed fields, 60 s cache |
| Wrong day buckets | `Africa/Cairo` in `$dateToString`, tested |
| Later Supabase move | `queries.ts` seam + §8 SQL |
