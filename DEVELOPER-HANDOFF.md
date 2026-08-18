# Unlimited-sw — Developer Handoff

**Date:** 18 August 2026
**Branch:** `fix/stock-remediation` (11 commits ahead of `origin/main`, **plus a large uncommitted working tree**)
**Test suite:** 14 files, **206 tests, all passing**
**Status:** nothing committed, nothing deployed. All of this lives on one laptop.

---

## 0. Read this part first

You are inheriting a codebase that is **in better shape than it looks**, and a working
tree that is **larger than it should be**.

The good news: the deep layers of this application — the inventory engine, the order
transaction, the pricing calculation — were already carefully built before this session
started. Repository pattern, real MongoDB transactions, optimistic locking, cache tags
that purge across serverless instances. Whoever did the stock remediation work knew
exactly what they were doing. Most of what follows is consolidation and hardening on
top of a solid base, not a rescue.

The risk: **none of it is committed or deployed.** A single laptop currently holds the
stock fix, six security fixes, four new feature folders and 206 tests. That is the most
urgent thing in this document, and it is addressed in §6.

---

## 1. What changed, by area

### 1.1 Security — 9 unauthenticated endpoints closed

**Root cause, and the thing to remember forever:**

```ts
// middleware.ts
export const config = { matcher: '/admin/:path*' };
```

That matcher protects admin **pages**. It does **not** match `/api/admin/...`, because
that pathname starts with `/api`. Every admin API route must therefore guard itself —
and many did not. The unsafe thing was the default.

| Endpoint | Was exposed to anyone | Action |
|---|---|---|
| `POST /api/promo` | **create your own discount code** | guarded |
| `GET /api/promo` | read every code you have | guarded |
| `PUT/PATCH/DELETE /api/promo/[id]` | edit or delete campaigns | guarded |
| `PUT /api/admin/products/[id]/city-pricing` | rewrite shipping & COD fees | guarded |
| `GET/PUT /api/admin/payment-settings` | switch off Cash on Delivery | guarded |
| `GET/PUT/DELETE /api/admin/notifications` | wipe order alerts | guarded |
| `GET/PATCH /api/admin/feedback` | read customer name, email, phone | guarded |
| `DELETE /api/admin/feedback/[id]` | delete any review | guarded |
| `GET /api/admin/performance` | internal metrics | guarded |
| `GET/PUT /api/admin/cities` | shipping config (guard was on `POST` **only**) | guarded |
| `app/actions/sendPriceAdjustmentEmail.ts` | dead server action, hardcoded totals | **deleted** |
| `app/api/send-email/` | any recipient, any content, no auth, no callers | **deleted** |

**The permanent fix — `__tests__/admin-routes-guarded.test.ts`:**

It walks `app/api/admin/**`, slices out **each exported handler body**, and fails if
`requireAdmin` is missing from it. A file-level grep is not enough — that is precisely
how `cities/route.ts` was mis-reported as safe when only its `POST` was guarded.

It also watches a named list of admin-only routes **outside** that folder (promo lives
at `/api/promo`), and it fails in **both directions**: if anyone ever adds a guard to
`/api/promo/validate` or `/api/payment-methods`, the test fails, because locking those
breaks checkout for real customers.

Deliberately-public routes are allowlisted **with a written reason** in the test file,
and a further test fails if a reason is missing.

### 1.2 Authentication hardening

| Problem | Detail | Fix |
|---|---|---|
| **Revocation did not work** | `isAdmin` is stamped into the JWT at sign-in. Middleware re-checked the live list on every request, but `requireAdmin` trusted the token — so removing an admin took away the dashboard while leaving **API access intact for up to 30 days** | `requireAdmin` and `check-auth` now check the live `adminEmails` list. All three guards agree |
| **The cookie WAS the secret** | `adminAuthenticated` was set to the literal value of `ADMIN_COOKIE_SECRET`: identical for every admin, unrevocable individually, and it never truly expired — the server only compared it to a constant, so a copied cookie worked forever | Signed token `issuedAt.nonce.signature` (HMAC). Secret never leaves the server; age verified server-side; every issued cookie distinct |
| **Unlimited password guessing** | `POST /api/admin/auth` accepted infinite attempts at any speed | 5 failures → 15-minute lock. Counter in **MongoDB**, because Netlify runs many instances and an in-memory counter is invisible to the others |
| **Timing-sensitive comparison** | `password !== ADMIN_PASSWORD` | constant-time compare |
| **No record of use** | the password door cannot identify a person | every successful use is logged |
| **Customers sent to the admin door** | the NextAuth `redirect` callback defaulted to `/admin`, so a shopper signing in with Google was bounced to `/access-denied` on their own shop | defaults to the storefront |

**⚠️ Edge-runtime note, important if you touch this:** `middleware.ts` runs on the Edge
runtime, which has **no Node built-ins**. The cookie verification therefore uses **Web
Crypto** (`crypto.subtle`), not `node:crypto`. A `node:crypto` version compiles fine and
then fails at runtime on every admin page load. This is also why the page guard and the
API guard can share one verification function instead of two that drift apart.

### 1.3 Four feature folders

The repository now uses a consistent shape. **The rule is the same everywhere:**

> A route's or page's folder **is** its URL. Addresses stay in `app/`. Logic moves into
> the feature folder. The route becomes a thin adapter that authenticates, validates,
> delegates and formats the response.

```
email/     16 code files   sending, templates, previews, test sender
product/    9 code files   model, schema, queries, actions, inventory, tags, ui/
payments/   3 code files   model, settings (cached), schema
login/      2 code files   adminCookie, rateLimit   (PARTIAL — see §5)
```

Each has a `README.md` documenting its layering, its rules, and the bugs it fixed.

**`product/` layering** (this is the pattern to follow):

```
route / page  →  actions  →  queries  →  MongoDB
```

- `queries.ts` is the **only** file that touches the database. Swap it for a Postgres
  implementation and nothing above changes — which matters, because a Mongo→Postgres
  migration is planned.
- `actions.ts` owns business rules and caching. Routes never query directly.
- `templates/` (email) is pure: data in, HTML out. It never sends and never queries.

Names were chosen by the owner for readability: `repository.ts` → **`queries.ts`**,
`service.ts` → **`actions.ts`**, and the symbols followed (`productQueries`,
`ProductQueries`, `MongoProductQueries`). Everything moved with `git mv`, so
`git log --follow` still shows full file history.

### 1.4 Bugs fixed, by severity

**🔴 Money / data integrity**

1. **Promo usage limits did nothing.** The order transaction incremented `usedCount`
   with a bare `$inc` and **no limit condition**; the correct atomic function
   (`incrementPromoUsage`) existed but was **never called**. The limit was only checked
   while the customer was still filling in the form, so a "10 uses" code could be
   redeemed indefinitely. Now claimed inside the order transaction with the limit
   enforced in the update itself. *Test: 10 concurrent claims against a limit of 3 →
   exactly 3 succeed.*
2. **Free-shipping codes were never counted at all** — the old check was
   `if (promoDiscount > 0)`, and a shipping-only code has a zero discount.
3. **The "only one payment-settings document" guarantee did not exist.** The schema
   declared `index({}, { unique: true })` — an index on an empty key, which constrains
   nothing and was never created (verified against production: only `_id_` existed).
   The admin `GET` *created* a document as a side effect, so two simultaneous reads
   could produce two documents, after which `findOne({})` returned an arbitrary one.
   Now a real unique key with an atomic keyed upsert.

**🟠 Correctness / performance**

4. **The storefront could not use its own index.** Reads filter `{ isActive: true }`
   and sort `{ price: 1 }`, but the only index was `{ isActive: 1, order: 1 }` — so
   MongoDB sorted **in memory on every request**, which degrades as the catalogue grows
   and is capped at 32 MB. Added `{ isActive: 1, price: 1 }`, keeping cheapest-first.
   *Test asserts the query plan contains `IXSCAN` and **no** `SORT` stage.*
5. **Pagination was fake.** `/api/products?limit=20` loaded **every** product and
   sliced 20 out in JavaScript. Now `skip`/`limit` in the database.
6. **`?page=abc` showed an empty shop.** `parseInt` → `NaN` → `slice(NaN, NaN)` → an
   empty product list and no error.
7. **`/api/products/batch` was unbounded** — any number of ids in one request.
   Capped at 100. One malformed id used to throw a `CastError` and fail the whole basket.
8. **`/api/payment-methods` was `force-dynamic`** — a MongoDB round trip on **every
   checkout page load** for a document that changes about twice a year. Now cached via
   Next's Data Cache (shared across instances) and purged by tag on save.
9. **The date picker saved the wrong day.** Both promo pages used
   `date.toISOString().split('T')[0]`, which converts to UTC first. Egypt is UTC+2/+3,
   so a date picked in Cairo is local midnight = the **previous day** in UTC. Every
   expiry date was set one day short. Fixed in `utils/localDate.ts`.
10. **The admin Cash-on-Delivery toggle did nothing.** `app/checkout/page.tsx`
    hardcoded `codEnabled: true`, bypassing the API "for latency". *The live value was
    read first (read-only) and confirmed `true`, so reconnecting it changed nothing for
    customers — had it been `false`, the fix would have removed COD from a live store.*
11. **"Valid from" on promo codes did nothing.** The form had the picker, the API
    discarded the value, no field existed to hold it, and validation never checked one —
    so every scheduled campaign went live immediately. Added `startsAt`, backwards
    compatible (absent = live now).
12. **The About page headline was invisible to search engines.** The whole page was a
    client component for a typewriter effect, and the `<h1>` rendered **empty** in the
    server HTML.

**🟡 Hygiene**

13. **`framer-motion` was imported by 7 files but not in `package.json`** — present only
    as a transitive dependency of `motion`. Netlify installs exactly what is declared, so
    the day `motion` stops bundling it, the build fails — and `app/shop/page.tsx` is one
    of the seven.
14. **`/admin/payment-settings` was a 7-line stub** rendering only an `<h1>`, while
    `navItems.tsx` linked to it and opened it in a **new tab**.
15. Duplicate unused `SessionProvider`; two email templates that were ~95% copies of each
    other; ~200 identical lines of email HTML in two files; hardcoded SMTP username in
    source; customer emails printed into logs; hardcoded copyright years that disagreed.
16. **HTML injection in emails** — customer name, address and notes went into the markup
    raw. Now escaped, with a test that feeds hostile input through a template.

---

## 2. Conventions to keep

1. **Every `/api/admin/*` route calls `requireAdmin()` itself.** The middleware will not
   do it for you. The test enforces this.
2. **Never trust the caller for a recipient or a price.** `send-price-adjustment` reads
   the order from the database and mails the address on the order. Order totals are
   computed server-side and clamped with `Math.max(0, …)`.
3. **Stock only moves through `reserveStock` / `releaseStock`**, inside a transaction.
   The admin product `PUT` **must never** write stock — `stripStockFromUpdate()` exists
   because the edit form posts variants the browser loaded minutes earlier, which
   silently erases orders placed in between. Four tests cover this; do not weaken them.
4. **Cache invalidation uses tags, not the in-process Map.** `lib/cache.ts` is per
   process; on Netlify each instance has its own copy, so clearing it only affects the
   instance that served the request. Use `revalidateTag`.
5. **Validation is zod**, at the route boundary, before anything reaches the database.
6. **Feature folders own their logic; `app/` owns only addresses.**

---

## 3. How to verify everything

```bash
npm ci
npx tsc --noEmit          # types
npx eslint .              # lint  (4 pre-existing issues in utils/logger.ts + exportOrders.test.ts)
npx jest                  # 206 tests
MONGO_BYPASS=true npx next build --turbopack
```

Useful tooling added:

```bash
npm run email:preview            # renders every email to .email-preview/*.html
npm run email:test -- you@x.com  # sends every template, for real, to one address
npm run db:indexes               # creates missing product indexes (additive only)
npm run stock:drift              # stock reconciliation dry run
```

**Note on test flakiness:** two suites each start their own in-memory MongoDB replica
set. Under load this occasionally times out and reports phantom failures (observed once:
121 s and 12 failures, then three consecutive clean runs at ~6 s). Worth consolidating
before this runs in CI, or a red build will eventually be ignored.

---

## 4. Deployment checklist — do these in order

1. **Set up staging first.** A copy of the site pointed at a **copy** of the database.
   Nothing here has run against production traffic.
2. **On staging, set `EMAIL_REDIRECT_TO=<your address>`.** Every email then goes to that
   one address, so a staging deploy against copied production data cannot mail real
   customers. This is the single most important staging setting.
3. **Check these environment variables in Netlify:**
   - `ADMIN_PASSWORD` and `ADMIN_COOKIE_SECRET` — the emergency password door returns
     `503` without both. Neither is in `.env.local`; their production status is unknown.
   - `ADMIN_EMAILS`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `MONGODB_URI`, `BREVO_SMTP_*`,
     `GOOGLE_CLIENT_*`, `ALKADY_AWS_*`.
4. **Run `npm run db:indexes` once after deploying.** Declaring an index in the schema
   does not create it in Atlas; Mongoose builds it lazily during some unlucky customer's
   request. The script is **additive** — it calls `createIndexes`, never `syncIndexes`,
   which would drop any index created by hand in Atlas.
5. **Expected side effect:** anyone currently signed in via the old password cookie is
   signed out on deploy, because the old cookie format no longer verifies. Google
   sessions are unaffected.
6. **Verify after deploy:** place a test order end-to-end (variant stock decrements,
   confirmation email arrives, admin alert arrives), apply a promo code with a usage
   limit and confirm it stops at the limit, and open `/admin/payment-settings`.

---

## 5. What is NOT done

**Ordered by value, highest first.**

### 🔴 Priority 1 — Get this off the laptop
Nothing is committed. Split the working tree into reviewable commits — the security
fixes are independently shippable and shouldn't wait behind a refactor. Then staging,
then production.

### 🟠 Priority 2 — Finish `login/`
Only the two new files (`adminCookie.ts`, `rateLimit.ts`) live there. Still scattered:
`lib/auth.ts`, `lib/admins.ts`, `lib/requireAdmin.ts`, `components/SessionWrapper.tsx`,
`types/next-auth.d.ts`. Half-built folders are how conventions die.

### 🟠 Priority 3 — The session polling cost
`SessionWrapper` sets `refetchInterval: 5 minutes` + `refetchOnWindowFocus`, and `Nav`
calls `useSession()` on **every page**. Every anonymous shopper therefore triggers
repeated `/api/auth/session` calls. With 6–10k users that is a continuous stream of
Netlify function invocations for people who never log in. Nav is 481 lines and also
loads framer-motion, reads the cart, manipulates the DOM directly with
`querySelectorAll`, and attaches a global touch listener — it is on every page, so
whatever it costs, it costs everywhere. **This is the biggest remaining performance
item.**

### 🟡 Priority 4 — Tier 3 of the product consolidation (~3,900 lines, no test coverage)
`app/admin/add-product` (510), `edit-product/[id]` (516), `delete-product/[id]` (290),
`products/[id]/city-pricing` (292), `admin/sections/products.tsx` (635),
`app/shop/page.tsx` (393), `app/product/[id]/*` (657).

`delete-product` and `city-pricing` **have been reviewed and are sound** — confirmation
before deleting, abort handling, retry, NaN guards. The other five have **not** been
read. Write characterization tests before moving any of them.

### 🟡 Priority 5 — Known and deliberately unfixed
- The React `useEffect` in `useProduct.ts` omits `router` from its dependency array.
- Four pre-existing lint issues (`utils/logger.ts`, `utils/exportOrders.test.ts`).
- `docs/superpowers/specs/` is **untracked in git** — two design documents that exist
  only on the laptop.
- No crash reporting or analytics anywhere.

### Later — Mongo → Postgres (Supabase)
Do not start this until staging exists and the bug backlog is clear. Migrating a buggy
system reproduces the bugs in a new database and adds migration bugs on top.
`product/queries.ts` is the seam that makes it survivable: it is the only file that knows
MongoDB exists.

---

## 6. A note to whoever picks this up

Three things worth knowing about how this work was done, because they are the habits
that found the bugs — not the refactors.

**Verify, do not assume.** Every claim in this document was checked. The index fix is
proven by asserting on MongoDB's own query plan. The promo race is proven by firing ten
concurrent claims at a limit of three. The Cash-on-Delivery fix was preceded by a
read-only query against production, because if that value had been `false`, "fixing" the
toggle would have removed Cash on Delivery from a live Egyptian store — most of its
orders — within a minute of deploying.

**Test the safety net before trusting it.** After writing the product characterization
tests, the sort order was deliberately broken to confirm the suite caught it, then
restored and confirmed byte-identical with `git diff`. The same was done for the admin
route guard. A net nobody has tested is decoration.

**The tools will catch you, and that is the point.** Three real mistakes were made and
caught during this work: a missed import found instantly by `tsc` (which is exactly why
files were moved one at a time, verifying between each); an `immutable: true` on a
Mongoose field that **silently discards updates**, reintroducing the very duplicate-document
bug being fixed — caught by a test; and a first draft of the cookie verification using
`node:crypto`, which would have compiled cleanly and then crashed every admin page on the
Edge runtime.

The hardest bugs here were not the complicated ones. They were the **quiet** ones — a
toggle that did nothing, a date one day early, a usage limit that never applied, an index
that was never created. None of them threw an error. All of them were costing something.

The foundation you are working on is genuinely good. Treat the tests as the contract,
keep the guard rails in place, and be as suspicious of things that appear to work as of
things that visibly break.

Good luck. It is in far better shape than it was.
