# Store audit — 30 Oct 2026

## Phase 2 — what was fixed (branch `fix/audit-30oct`)

Hatem: "proceed all of them", and order status is followed on WhatsApp, so
delete it from the code.

| # | Fix | Where |
|---|---|---|
| 1 | Contact list needs an admin; page size capped at 100; search escaped; form rate-limited + validated; saved record no longer echoed back | `app/api/contacts/route.ts`, guard test |
| 2 | Public reviews: only lines that START with From:/Email:/Phone: are removed; text wraps, keeps line breaks | `app/sections/feedbackText.ts`, `FeedbackForm.tsx` |
| 3 | Admin reviews table shows the whole text (3 lines + "عرض الكل") | `admin/sections/reviews.tsx` |
| 4 | Review form: 500-char limit + counter, stars required before sending, server's real reason shown | `FeedbackForm.tsx` |
| 5 | Feedback endpoint: rate limit (5 / 15 min / address) + zod types | `app/api/feedback/route.ts` |
| 6 | **Dip Bars stock −7 → 2: done in production 30 Oct**, one guarded update (only if still −7 / 2) | — |
| 7 | **Order status removed** from the admin: column, filter, confirm dialog, overview badge, `PATCH /api/orders/[id]`. The `status` field stays on documents (all `pending`). Deleting an order is how stock goes back | orders section, `OrderColumns`, `useOrders`, route |
| 8 | Optional "Uses per customer" on promo codes, counted by the phone's last 10 digits, inside the order transaction. Old codes: unchanged | model, schema, both promo forms, `promoService`, `orderCreationService` |
| 9 | Recorded discount never exceeds the subtotal | `orderPricingService.ts` |
| 10 | Email retry on Vercel: daily cron → `GET /api/internal/drain-emails` with `CRON_SECRET` | `vercel.json`, drain route |
| P3 | Preview deployments refuse orders (they share the prod DB) | `app/api/orders/route.ts` |
| P3 | Duplicate `key` index declarations removed | `requestCounter.ts`, `loginAttempt.ts` |

New tests: `promo-per-customer.test.ts` (it caught a real bug before shipping:
the order being placed counted against its own customer), `feedback-text.test.ts`,
contacts added to `admin-routes-guarded.test.ts`.

**Hatem's steps at deploy:** add `CRON_SECRET` (any long random string) to the
store's Vercel env, and delete `MONGO_BYPASS`. Until `CRON_SECRET` exists the
cron answers 503 and nothing else changes.

Left as decisions, not bugs: per-unit shipping/COD; a separate Atlas database
for previews (free tier) instead of the order guard.

---

# Phase 1 findings (read-only)

Nothing in the code or the database was changed to write this. Database facts come
from read-only queries against production (counts and index statistics only — no
customer data printed).

## What production actually looks like

| Fact | Value | Why it matters |
|---|---|---|
| Database the shop sells from | **MongoDB** (`SHOP_DB` is not set on Vercel) | Every finding below is about the Mongo path |
| Orders, all time | **374** (40 in October, ~60/month) | Database cost is not a problem at this size |
| Products | 5 | |
| Contacts / feedback / product reviews | 10 / 4 / 0 | |
| Biggest collection | `analytics_events`, 36,670 docs, 8 MB (+6 MB indexes), ~300/day | Has a retention TTL — fine |
| Order statuses | **all 374 are `pending`** | Status tracking has never been used |
| Email queue | 134, all `sent` | No stuck emails |
| DB connections at audit time | 44 of 500 | Healthy |

"60k users" are visitors; the database load is small. The real risks are
**security and correctness**, not cost.

## Findings, most serious first

### P0 — fix now

**1. Customer contact list is public.** `GET /api/contacts` has no admin check.
Verified live: `https://unlimited-sw.com/api/contacts` returns names + emails to
anyone (10 people today). It also accepts any `limit` and an unescaped regex
`search` (a crafted pattern can pin the database CPU).
*Fix:* `requireAdmin()` on GET, cap `limit`, escape `search`. ~10 lines, no data change.

### P1 — real bugs customers hit

**2. Reviews cut off on the public site** (the bug you saw). `FeedbackForm.tsx`
`cleanMessage()` cuts a review at the first `from:`, `email:` or `phone:`
*anywhere in the text*, case-insensitive. "I ordered from: Alexandria and it
arrived fast" is shown as "I ordered". It was meant only for an old storage
format where those words started their own line.
*Fix:* only strip lines that START with `From:`/`Email:`/`Phone:` (the admin
side already does it this way). Also add `break-words` so a long unbroken word
cannot overflow the card.

**3. Reviews cut off in the admin table.** `admin/sections/reviews.tsx` shows the
text with `truncate` (one line, rest hidden).
*Fix:* wrap the text, clamp to 3 lines with a "show more" toggle.

**4. A long review is silently lost.** The server refuses feedback over 500
characters, but the textarea has no limit and the page only says "Error. Please
try again." Same for submitting without choosing stars (server needs a rating;
the form allows 0). The customer retypes, fails again, gives up.
*Fix:* `maxLength={500}` + a live counter, require a star before Submit, show
the server's actual message.

**5. Feedback endpoint has no rate limit or type checks.** `POST /api/feedback`
can be scripted to fill the moderation queue. Orders, uploads and analytics all
use the shared limiter; this one was missed.
*Fix:* same `consumeRateLimit` as the others; validate types with zod.

### P2 — data and logic

**6. "Premium Dip Bars" stock is −7 at product level, 2 on its only variant.**
Old damage from before the September stock fix; today's code cannot produce it
(edits recompute the total; every decrement is guarded). The storefront reads
the variant (2), but anything that reads the total sees −7.
*Fix:* one-time write `stock = 2`. **Needs your OK** — it writes to production,
and you should confirm 2 is what's really in the warehouse.

**7. Any status can jump to any other.** Delivered → pending, shipped → pending
are allowed. Unused today (finding: everything is pending), but the moment the
team starts using statuses this matters.
*Fix:* allowed-transition table (pending→confirmed→shipped→delivered; cancel
from pending/confirmed only; un-cancel back to pending).

**8. Promo codes: no per-customer limit.** One person can use the same code on
every order until the global limit runs out. Fine for "100 uses for anyone",
wrong for "first order" codes.
*Fix (only if you want it):* optional `perCustomerLimit`, counted by phone.

**9. Fixed-amount promo bigger than the cart stores the full discount.** A 500 EGP
code on a 300 EGP cart charges 0 (correct) but records `discountAmount = 500`,
so revenue reports over-count discounts. None exist today.
*Fix:* store `min(discount, subtotal)`.

**10. Email retry never runs on Vercel.** The retry job (`netlify/functions/drain-emails.mts`,
every minute) was Netlify's; Vercel has no cron for it. Emails are sent inline at
checkout and all 134 went out, so nobody has noticed — but any email that fails
at checkout will never be retried.
*Fix:* a Vercel cron calling `/api/internal/drain-emails` (Hobby allows one daily
run; hourly needs Pro, or keep a free external pinger).

### P3 — housekeeping

- **Preview deployments use the production database** (`MONGODB_URI` is set for
  Preview too). Any preview branch that places a test order writes a real order.
  Point Preview at a separate free Atlas database.
- `MONGO_BYPASS` exists on Vercel. If it were `true`, checkout would refuse every
  order (the code guards this). Worth deleting so nobody flips it by accident.
- `requestCounter.key` declares its index twice (`unique` + `index`) — a startup
  warning only.
- Mongoose `autoIndex` is on in production, so each cold start re-checks every
  index. Harmless at this size.
- Product-level shipping and COD are charged **per unit** (2 bars = 2× shipping).
  Intentional? If not, it's a pricing decision, not a bug.

## Checked and found sound

- Checkout prices everything on the server; the browser's numbers are only
  compared, never trusted. Totals can't go below zero.
- Order + stock + promo use + owed email commit in ONE transaction; a double
  click returns the same order (unique `clientOrderId`).
- Stock decrements are atomic and bind the variant name and its stock together;
  cancel/un-cancel/delete restore stock exactly once (`stockRestored`).
- Promo usage limit is enforced inside the update, so two buyers can't both take
  the last use.
- Admin: every admin route checks the live `ADMIN_EMAILS` list; the emergency
  password cookie is signed, 24 h, brute-force locked.
- Payment screenshot upload: rate-limited, 5 MB cap, checks the actual bytes are
  an image, not the file name.
- Order list: search escaped and anchored, page size capped.

## The big question before Phase 2

`shopdb/` holds a finished-but-unswitched move of the shop to Supabase, and the
dashboard (admin.unlimited-sw.com) already has the new order desk. Someone added
`DASHBOARD_URL` to the store's Vercel today. **If the cutover is coming, building
new admin features in the Mongo store (analytics, settings, bulk tools) is wasted
work** — they'd be thrown away. So for sections 2–3 of your brief (admin
controls, settings) I recommend: decide the cutover first, then build those in
the dashboard once.

Phase 2 (fixes 1–5, 7, 9) touches no data and keeps old behaviour for existing
records. Each ships on a branch, with tests, and only reaches production when you
say so.
