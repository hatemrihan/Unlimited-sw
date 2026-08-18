# Cart · Checkout · Speed · Production-Readiness Review

**Date:** 18 August 2026
**Scope read (every file, in full):** `contexts/CartContext.tsx`, `app/cart/page.tsx`,
`app/checkout/page.tsx`, `app/checkout/hooks/*`, `app/api/orders/route.ts`,
`services/orderCreationService.ts`, `services/orderPricingService.ts`, `services/promoService.ts`,
`app/api/promo/validate/route.ts`, `app/api/cart/validate/route.ts`, `app/api/checkout/cities/route.ts`,
`app/api/products/**`, `product/actions.ts`, `lib/cache-ttl.ts`, `app/product/[id]/page.tsx`,
`app/shop/page.tsx` (fetch + add-to-cart), `app/sections/Products.tsx` (fetch), `app/api/upload/route.ts`,
`app/api/s3-upload/route.ts`, `components/SessionWrapper.tsx`, `app/layout.tsx`, `next.config.ts`,
`public/_headers`, `package.json`.

---

## 0. Verdict in one paragraph

**The server side of checkout is production-grade. The client side is not yet, and one bug
makes promo codes unusable at checkout.** The order route re-prices everything from MongoDB,
refuses tampered totals with a 409, reserves stock and claims the promo inside one transaction,
and validates the body with zod. That is the part that protects money, and it is right.
What is left is: (1) a broken promo request, (2) three public endpoints with no rate limit
(orders, upload, s3-upload) — one of which lets anyone reserve your entire stock with fake COD
orders, (3) a cart page that is slower than it needs to be by roughly N× (one request per line,
re-fetched on every +/− click), (4) ~500 lines of dead "legacy ID migration" code in four
places, and (5) the customer waits for SMTP before seeing "thank you". None of these are
refactors; they are targeted fixes. Do not ship to production before §2 items 1–3 are done.

---

## 1. What is solid (do not touch)

| Layer | File | Why it is right |
|---|---|---|
| Money authority | `services/orderPricingService.ts` | Recomputes lines, shipping, COD, promo from Mongo. Mirrors the client arithmetic; tolerance 1 EGP; mismatch → 409, never silent substitution. |
| Transaction | `services/orderCreationService.ts` | Reserve stock → create order → claim promo, all in `withTransaction`; bookkeeping reset on retry; cache tags purged after commit. |
| Body validation | `lib/schemas/order.schema.ts` via `createOrderSchema.safeParse` | Quantities are validated positive integers before pricing/reservation see them. |
| Bypass guard | `app/api/orders/route.ts:20` | `MONGO_BYPASS` in production refuses orders (503) instead of silently discarding them. |
| Availability check | `app/api/cart/validate/route.ts` | Live, uncached, advisory only, transaction stays the authority. |
| Cart reducer | `contexts/CartContext.tsx` | Variant-aware identity, stock-capped add/update, localStorage sanitised on load, corrupt JSON handled. |
| Shop add-to-cart | `app/shop/page.tsx:214-226` | Variant products are routed to the product page instead of adding an un-variant line — correct, this is what would decrement the aggregate mirror. |
| Cache design | `product/actions.ts` + `lib/cache-ttl.ts` | Data Cache with tags, 45 s / 30 s TTLs, live stock split into `/api/products/stock`. Correct reasoning, correct TTLs. |
| Headers | `next.config.ts`, `public/_headers` | CSP, HSTS, nosniff, frame deny. Present. |

---

## 2. Findings, by severity

### 🔴 P0 — must fix before production

**1. Promo codes cannot be applied at checkout — every attempt returns "Invalid promo code".**
- `app/api/promo/validate/route.ts:10` returns **400** when `body.orderTotal === undefined`.
- `app/checkout/hooks/useCheckoutPricing.ts:112` sends `{ code: trimmed }` — **no `orderTotal`**.
- The hook then reads `data.message` (line 130) but the route returns `data.error` → the customer
  sees the generic "Invalid promo code" no matter what the real reason is.
- **Second bug behind it:** even with `orderTotal` sent, the client computes the discount itself
  (`useCheckoutPricing.ts:87-91`) and ignores `maximumDiscount`. The server applies the cap
  (`promoService.ts:41`). A capped percentage code would therefore price differently on the two
  sides → **409 PRICING_MISMATCH** at submit. The client must **use `data.promo.discount` from
  the server**, not recompute.
- Also: `minimumOrder` is only enforced server-side; the client should send the subtotal so the
  customer sees "Minimum order L.E X" while typing, not at submit.
- *Test to write:* checkout hook test that applies a code and asserts the request body contains
  `orderTotal`, and that a capped code produces the server's discount.

**2. `POST /api/orders` has no rate limit and no idempotency.**
- Anyone can script COD orders with fake phone numbers. Each one **reserves real stock** inside
  the transaction. 20 requests = your best product shows "out of stock" to real customers until
  an admin cancels each order and stock is restored. This is the cheapest attack on this store.
- Idempotency: `isSubmitting` stops a double-click, but a customer whose request times out on a
  slow mobile network (Egypt, 3G) and presses again creates **two orders**. Fix: client generates
  a UUID per checkout attempt, sends it as `clientOrderId`; server has a unique index on it and
  returns the existing order on a duplicate.
- Rate limit: reuse `login/rateLimit.ts` (Mongo-backed, already exists) keyed by IP + phone:
  e.g. 5 orders / 10 min / IP.
- *Tests:* duplicate `clientOrderId` returns the same `orderId` and reserves stock once; 6th
  order in the window → 429.

**3. `POST /api/upload` and `POST /api/s3-upload` are public, unauthenticated, unlimited.**
- `/api/upload` is legitimately public (InstaPay screenshot) but accepts **any content type**
  (the client filters to `image/*`; the server does not) up to 10 MB, no rate limit → your S3
  bucket is a free file host and your AWS bill is anyone's to spend.
- `/api/s3-upload` (50 MB, used only by `components/FileUpload.tsx` = admin product images)
  **must be behind `requireAdmin`**. Add it to the named list in
  `__tests__/admin-routes-guarded.test.ts` so it can never regress.
- For `/api/upload`: enforce `image/*` server-side (check magic bytes, not just `file.type`),
  cap at 5 MB (client already says 5 MB), rate limit by IP, and put objects under a
  `checkout-screenshots/` prefix so they can be lifecycle-expired.

### 🟠 P1 — fix before or immediately after launch

**4. Cart page performance: N requests per render, repeated on every quantity change.**
- `app/cart/page.tsx:104-116` fetches `/api/products/${id}` **once per unique product**, in
  parallel. `/api/products/batch` exists (capped at 100) and is not used.
- The identity string (line 62-64) includes **quantity**, so every +/− click re-fires the whole
  fetch set. Five products, five clicks = 25 round trips to a Netlify function.
- The whole page is a spinner until those fetches return (`if (loading) return <spinner/>`,
  line 254) — the customer sees nothing, not even their items.
- `/api/products/[id]` is **cached 30 s**, so the "live stock" the cart page reads can be
  30 s stale — while `/api/products/stock` (uncached) exists for exactly this.
- **Fix:** one `POST /api/products/batch` for prices/images + one `GET /api/products/stock?ids=`
  for availability, keyed on the *set of product ids* (not quantities), and render the items
  immediately from localStorage with a per-line "checking…" state.

**5. `CartProvider` fetches the catalogue on every page load when the cart is non-empty.**
- `contexts/CartContext.tsx:171` — `fetch('/api/products?limit=200')` on mount, for every visitor
  with something in their cart, on every page. `limit=200` is silently capped to 100
  (`MAX_PAGE_SIZE`), and the paged read is **not** in the Data Cache
  (`getActiveProductsPage` → `find` + `countDocuments` on every call). So: two Mongo queries per
  page view per shopper-with-cart, for a price-refresh the cart page repeats anyway.
- This exists only to migrate "legacy static IDs". See item 6.

**6. Dead "legacy static ID migration" logic in four places.**
- `CartContext.tsx:181-234`, `cart/page.tsx:93-140`, `checkout/page.tsx:145-171`,
  `orderCreationService.ts:resolveLegacyProductIds`. Four layers, ~250 lines, all guarding
  against carts created before static products were removed. Static products were removed
  months ago; localStorage carts that old are gone.
- Keep **one** guard: the server one (`resolveLegacyProductIds`) — it is the only one that
  cannot be bypassed and it already logs when it fires. Delete the three client copies. That
  removes item 5's fetch entirely and ~200 lines of complexity from the client.
- *Before deleting:* grep the Netlify function logs for `Migrated legacy product id` — if it has
  fired in the last 30 days, keep the server guard; if never, it can go too later.

**7. The customer waits for SMTP before seeing "Thank you".**
- `app/api/orders/route.ts:236` — `await dispatchOrderPostProcessing(...)` blocks the response
  on Brevo (~2–3 s, more on a bad day; a Brevo outage = a hung checkout button then a timeout,
  and the customer retries → item 2's duplicate order).
- The comment is right that Netlify kills fire-and-forget. The correct fix is **Netlify
  Background Functions** or, cheaper: write a `pendingEmails` doc in the same transaction and
  have a scheduled function (Netlify cron, every minute) drain it. Order confirmation arriving
  60 s later is fine; a customer staring at "Processing…" for 8 s is not.
- Interim mitigation (one line): wrap the dispatch in `Promise.race` with a 4 s timeout so the
  worst case is bounded, and log the miss.

**8. Session polling from every anonymous shopper.** *(already in the handoff §5 P3, restating with numbers)*
- `SessionWrapper.tsx`: `refetchInterval: 300 s` + `refetchOnWindowFocus`. `Nav.tsx:43` calls
  `useSession()` on every page. Every tab-switch back to the site = a `/api/auth/session`
  function invocation, for people who will never log in.
- Nav is 481 lines, imports `framer-motion`, reads the cart, does three
  `document.querySelectorAll` passes and registers a global `touchstart` listener.
- **Fix:** mount `SessionProvider` only under `/admin/*` (a layout there), and make Nav read
  session lazily (or not at all — the storefront has no logged-in state to show). Set
  `refetchOnWindowFocus: false`. This is the single largest reduction in function invocations
  available.

**9. Product detail page bypasses the product seam and is fully dynamic.**
- `app/product/[id]/page.tsx` imports `ProductModel` and queries Mongoose directly (twice:
  product + related). `product/queries.ts` is supposed to be the only file that knows MongoDB
  exists — this page will break the Postgres migration.
- No `revalidate`, no `generateStaticParams` → rendered on every request, 2 queries each. Move
  reads into `product/queries.ts`, wrap in `unstable_cache` with `productTag(id)` (already
  exists), and let the existing order-commit purge keep it fresh. Live stock already comes from
  the client via `/api/products/stock`, so the page itself can safely cache 60 s+.

### 🟡 P2 — quality / consistency

10. **Home page `Products.tsx` uses `cache: 'no-store'` on the paged endpoint** (lines 44, 69), and
    the paged endpoint is uncached server-side → 2 queries per home page view. Either wrap
    `getActiveProductsPage` in `unstable_cache` (tag `PRODUCTS_TAG`) or let the home page use the
    cached all-products read and slice 6.
11. **Two truths for the shipping selector.** `useCheckoutPricing` calls
    `/api/checkout/cities?productIds=…` with `cache: 'no-store'`; the endpoint is uncached; it
    is called on every product-set change. Cheap today, but it is the same document set the
    batch endpoint returns. Consider returning `cityPricing` from `/api/products/batch` and
    computing the governorate list client-side, or caching the endpoint per product-set key.
12. **A product with no `cityPricing` entry for the chosen governorate ships for L.E 0.** Client
    (`useCheckoutPricing.ts:66-68`) and server (`orderPricingService.ts:97`) agree, so it is not
    a mismatch, but it is silent free shipping. Decide: is that intended? If not, the server
    should refuse the order for that governorate and the client should hide the governorate.
    `createProduct` defaults to Cairo/50/25 only.
13. **`totalWithShipping` display uses `.toFixed(0)` and `.toLocaleString()` inconsistently**
    between cart and checkout; harmless, but the checkout page shows `L.E 1500` and cart shows
    `L.E 1,500`.
14. **`orderDate: new Date().toISOString()` is sent from the client** (`checkout/page.tsx:200`) and
    ignored by the server (server sets `orderDate: new Date()`). Remove it from the payload so
    nobody later "fixes" the server to trust it.
15. **`ADD_ITEM` in the reducer silently drops the add** when it would exceed stock
    (`CartContext.tsx:60, 72`) — the caller has no way to know. `ProductClient` comment says
    "Buy Now no longer navigates on addItem failure" but `addItem` returns `void`. Return a
    boolean or throw so the UI can say "only N left".
16. **`next.config.ts` `images.domains` is deprecated** in Next 15 (use `remotePatterns`), and
    `unoptimized: true` disables the image optimizer entirely — every product image ships at
    original size. Given S3-hosted images and Netlify, either enable Netlify Image CDN or keep
    unoptimized but make sure uploads are resized at admin upload time (check
    `VariantImageManager` / `FileUpload`).
17. **CSP has `'unsafe-eval'` and `'unsafe-inline'` for scripts** — needed for Next dev, not for
    prod. Nonce-based CSP is a later item; note it.
18. **OG image path**: `layout.tsx` references `/one-image.jpg`; the file is at
    `/images/one-image.jpg` → broken social preview for the home page.

---

## 3. "Is it up to date?" — dependency check

| Package | Declared | Note |
|---|---|---|
| `next` | ^15.5.7 | Current 15.x line. Fine. Do not jump to 16 before staging. |
| `react` / `react-dom` | 19.1.0 (pinned) | Fine. |
| `next-auth` | ^4.24.11 | v4 is maintenance-only; v5 (Auth.js) is the future but the migration is invasive. **Not** a blocker; schedule after Postgres decision since v5's adapter story matters there. |
| `mongoose` | ^8.18 | Fine. |
| `zod` | ^4.3.6 | Fine. |
| `framer-motion` + `motion` | both ^12.23 | Same package twice (motion re-exports framer-motion). Pick one (`motion`), remove the other, fix 7 imports. |
| `radix-ui` + `@radix-ui/react-*` | both | Same story: `radix-ui` is the umbrella. Consolidate. |
| `xlsx` 0.18.5 | | Has known CVEs (prototype pollution / ReDoS) and is unmaintained on npm. Used only by admin export (`utils/exportOrders.ts`). Replace with `exceljs` or `sheetjs` CDN build, or accept the risk since it only runs in the admin's browser on their own data. Note it. |
| `jspdf` 3.x | | Fine. |

Run `npm audit --omit=dev` and `npx npm-check-updates` on staging; do not bump majors before the
suite is green on staging.

---

## 4. "Connecting it with all products" — what that actually means here

Every product-touching path and whether it goes through the seam (`product/queries.ts`):

| Path | Goes through seam? | Action |
|---|---|---|
| `GET /api/products` (shop) | ✅ `getActiveProducts` | — |
| `GET /api/products?page=` (home) | ✅ `getActiveProductsPage` | add Data Cache (item 10) |
| `GET /api/products/[id]` | ✅ `getProductById` | — |
| `POST /api/products/batch` | ✅ `getProductsByIds` | make the cart use it (item 4) |
| `GET /api/products/stock` | ✅ `product/inventory` | make the cart use it (item 4) |
| `app/product/[id]/page.tsx` | ❌ direct Mongoose | move (item 9) |
| `orderPricingService.ts` | ❌ direct `Product.find` | acceptable (server-only, transactional context) but should call a `productQueries.findManyForPricing(ids)` so the Postgres seam holds |
| `checkout/cities/route.ts` | ❌ direct `Product.find` | same — one query function |
| `orderCreationService.resolveLegacyProductIds` | ❌ direct | delete or move (item 6) |
| `emailQueueService.ts:58` | ❌ direct `Product.find` | move to a query function |
| Admin pages (add/edit/delete/city-pricing) | via `/api/admin/products` → actions | ✅ |

**Concrete rule to add to `product/README.md`:** *"Nothing outside `product/queries.ts` may import
`@/product/model` or `Product` from Mongoose."* Then add a test that greps for it (same style as
`admin-routes-guarded.test.ts`) — it will fail today on 5 files, which is the to-do list.

---

## 5. Speed — where the time actually goes (per page, per shopper)

| Page | Function invocations today | After plan |
|---|---|---|
| Any page, anonymous, cart empty | 1 (`/api/auth/session` on focus) | 0 |
| Any page, cart non-empty | 2 (`session` + `products?limit=200` → 2 Mongo queries) | 0 |
| Home | 1–2 (`products?page=1&limit=6`, uncached, 2 queries) + session | 1, cached |
| Shop | 1 (`/api/products`, cached) + session | 1, cached |
| Product | SSR: 2 Mongo queries per request + client stock call | SSR cached; 1 stock call |
| Cart, N products | **N** (`/api/products/[id]`) + `products?limit=200` if any legacy id — repeated on every +/− | **2** (batch + stock), once per product-set |
| Checkout | `payment-methods` (cached) + `cart/validate` + `checkout/cities` + `promo/validate` per apply | same count, but cities cached |
| Place order | 1, blocks on SMTP 2–3 s+ | 1, responds in ~300 ms |

The two biggest wins are **session polling off the storefront** and **cart batching**. Both are
small diffs.

---

## 6. The plan — ordered, with what "done" means

Each phase is one reviewable commit group. Estimated sizes are for the diff, not the time.

### Phase A — Ship blockers (small diffs, do first, ~1 day)
| # | Change | Files | Test that proves it |
|---|---|---|---|
| A1 | Send `orderTotal: refreshedSubtotal` from the promo hook; read `data.error`; use `data.promo.discount` instead of recomputing; re-validate on subtotal change | `useCheckoutPricing.ts` | hook test: request body has `orderTotal`; capped code shows server discount; existing `promo-usage.test.ts` still green |
| A2 | Idempotency: `clientOrderId` (UUID, generated once per checkout mount) → unique sparse index on `orders.clientOrderId`; server returns existing order on E11000 | `checkout/page.tsx`, `models/order.ts`, `api/orders/route.ts`, `order.schema.ts` | same id twice → same `orderId`, stock reserved once |
| A3 | Rate limit `POST /api/orders` (IP + phone) and `POST /api/upload` (IP) using `login/rateLimit.ts` | `api/orders/route.ts`, `api/upload/route.ts` | 6th call → 429 |
| A4 | `requireAdmin` on `/api/s3-upload`; add to guard test's named list. Server-side `image/*` + 5 MB + magic-bytes on `/api/upload` | 2 routes, guard test | guard test red→green; non-image → 415 |
| A5 | Fix OG image path | `layout.tsx` | — |

### Phase B — Cart & checkout speed (~1 day)
| # | Change | Files | Test |
|---|---|---|---|
| B1 | Cart page: replace per-id fetch with `POST /api/products/batch` + `GET /api/products/stock`; identity keyed on product-id set; render items immediately, per-line "checking" state | `app/cart/page.tsx` | component test: N items → exactly 2 requests; +/− triggers 0 new requests |
| B2 | Delete client-side legacy-ID migration in `CartContext`, `cart/page`, `checkout/page`; keep server guard | 3 files | existing tests green; grep `static-product` returns only the server file |
| B3 | Return boolean from `addItem`; `ProductClient` shows "only N left" on refusal | `CartContext.tsx`, `ProductClient.tsx` | reducer test |
| B4 | Remove `orderDate` from client payload | `checkout/page.tsx` | schema test unchanged |

### Phase C — Global invocation cost (~half day)
| # | Change | Files |
|---|---|---|
| C1 | Move `SessionProvider` to `app/admin/layout.tsx` (create it); `refetchOnWindowFocus: false` | `layout.tsx`, `SessionWrapper.tsx`, new admin layout |
| C2 | Nav: drop `useSession` on the storefront (or guard behind pathname starts with `/admin`) | `Nav.tsx` |
| C3 | Wrap `getActiveProductsPage` in `unstable_cache` tagged `PRODUCTS_TAG`; drop `no-store` in `Products.tsx` | `product/actions.ts`, `Products.tsx` |

### Phase D — Post-order email off the request path (~half day)
| # | Change |
|---|---|
| D1 | Interim: `Promise.race([dispatch, timeout(4000)])` + log |
| D2 | Proper: `pendingEmails` written in the transaction; Netlify scheduled function drains it; admin notification of failures |

### Phase E — Seam integrity (~1 day, can wait for Postgres prep)
| # | Change |
|---|---|
| E1 | `app/product/[id]/page.tsx` → `productQueries.findByIdForPage` + `findRelated`; `unstable_cache` with `productTag(id)`; `revalidate = 60` |
| E2 | `orderPricingService`, `checkout/cities`, `emailQueueService` → query functions |
| E3 | Test: no file outside `product/queries.ts` imports `@/product/model` |

### Phase F — Hygiene (any time)
Consolidate `motion`/`framer-motion`; `radix-ui`; `images.remotePatterns`; decide on item 12
(zero-shipping governorates); `xlsx` decision; item 13 formatting.

---

## 7. Production readiness checklist (in addition to handoff §4)

- [ ] Phase A merged and on staging.
- [ ] `npm audit --omit=dev` reviewed; `xlsx` decision recorded.
- [ ] Staging: place a COD order, an InstaPay order with screenshot, an order with a
      **percentage promo that has `maximumDiscount`**, an order with a `minimumOrder` promo
      below the minimum (must be refused *at apply time*, not at submit).
- [ ] Staging: submit the same order twice with the same `clientOrderId` → one order.
- [ ] Staging: 6 rapid orders from one IP → 429 on the 6th.
- [ ] Staging: upload a `.exe` renamed `.png` to `/api/upload` → 415.
- [ ] Netlify function log after 24 h on staging: count `/api/auth/session` invocations from
      non-admin paths → should be ~0 after Phase C.
- [ ] Lighthouse mobile on `/`, `/shop`, `/product/[id]`, `/cart` — record before/after.
- [ ] `EMAIL_REDIRECT_TO` set on staging, **unset** on production (verify with
      `/api/admin/email-config-check`).
- [ ] Rollback plan: the previous Netlify deploy is one click; the only irreversible step is
      `db:indexes` (additive, safe) and the new `clientOrderId` index (sparse, safe).

---

## 8. What I did not read

`app/product/[id]/ProductClient.tsx` (only grepped for stock/addItem lines), `Nav.tsx` body
(only grepped hooks and DOM access), `models/order.ts` beyond `orderId`, `emailQueueService.ts`
body, admin product pages (already listed as Tier 3 in the handoff). Nothing in this document
depends on their internals; Phase B3 and C2 touch two of them and should start with a full read.
