# Stock / Inventory Remediation Plan — Unlimited-sw

**Audience:** dev team
**Context:** live production e-commerce, ~6k users. Every change below is ordered so that
the highest-impact, lowest-risk fixes ship first. Nothing here requires a schema rewrite
or a data migration that can lose orders.

**Golden rule for this whole plan:** MongoDB is the only source of truth for stock.
The client never decides stock, price, or quantity — it only *displays* what the server says.

---

## 0. How stock flows today (as-built)

```
Admin (add/edit product)
  └─ variants[].stock  ← typed by admin
  └─ product.stock     ← auto-computed = SUM(variants[].stock)   [hooks/useAddProduct.ts:63, hooks/useProduct.ts:148]

Storefront
  ├─ /shop            → getAvailableStock() = SUM(variants[].stock)   [app/shop/page.tsx:50]
  ├─ / (Products.tsx) → same SUM                                      [app/sections/Products.tsx:93]
  ├─ /product/[id]    → per-variant stock                             [ProductClient.tsx:61]
  └─ /cart            → re-validates against /api/products/batch      [app/cart/page.tsx:161]

Checkout → POST /api/orders → createOrderTransaction()
  └─ decrements variants[].stock  IF orderProduct.variant?.name exists
  └─ else decrements product.stock
```

**The whole system breaks at the last arrow.** Details below.

---

## 1. CRITICAL — the root cause of "stock is not working"

### BUG-1 · The variant name never reaches the stock decrement (data-contract mismatch)

- Checkout builds the order payload with the variant flattened into `size` / `color`:
  `app/checkout/page.tsx:142` → `size: item.variant?.name`
- But the stock engine looks for `orderProduct.variant?.name`:
  `services/orderCreationService.ts:44`

`orderProduct.variant` is **always `undefined`**. Therefore:

- Variant stock (`variants[].stock`) is **NEVER decremented** — not once, in production.
- Every order instead decrements the aggregate `product.stock`.
- The product page keeps showing the *original* variant stock forever → **unlimited overselling
  of any single variant**.
- Once `product.stock` (the sum) hits 0, **every variant of that product becomes unbuyable**,
  even ones with real stock left → customers get
  `"للأسف ... خلصت من الستوك"` on a product that is physically in the warehouse.
- Same bug corrupts the admin notification: `services/emailQueueService.ts:31` uses the same
  `orderProduct.variant?.name`, so `stockLevels` is empty for every variant product → the
  "remaining stock" panel in admin notifications is silently blank.

**Fix (server-side, backwards-compatible — do it this way, not by changing the client first):**

In `services/orderCreationService.ts`, resolve the variant name defensively:

```ts
const variantName = orderProduct.variant?.name ?? orderProduct.size ?? undefined;
```

Do the identical change in `services/emailQueueService.ts:31`.

**Why server-first:** old cached JS bundles and any in-flight/abandoned carts already send
`size`. Fixing the server accepts both shapes immediately, with zero client deploy race.

**Then, in a follow-up deploy** (not the same one), make the checkout payload explicit —
send `variant: { name, color }` *in addition to* `size`/`color`, and keep the server's
`??` fallback permanently as a safety net.

**Also fix the order record itself:** `models/order.ts:37` (`OrderProductSchema`) has no
`variant` field. Add `variantName: { type: String }`. Without it you cannot restock a
cancelled order, cannot audit what was actually sold, and cannot reconcile.

---

### BUG-2 · The variant matching query can decrement the WRONG variant

`services/orderCreationService.ts:46-56`:

```js
{ _id: productId,
  'variants.name':  variant.name,
  'variants.stock': { $gte: qty } }
```

These two conditions are **not required to match the same array element**. A product with
`[{name:"Black", stock:0}, {name:"Red", stock:50}]` matches the filter for "Black" because
`variants.stock >= qty` is satisfied by *Red*. The positional `$` then updates whichever
element MongoDB matched first — so you can sell an out-of-stock Black and silently debit Red.

**Fix — use `$elemMatch` so both conditions bind to one element:**

```js
Product.findOneAndUpdate(
  { _id: productId,
    variants: { $elemMatch: { name: variantName, stock: { $gte: qty } } } },
  { $inc: { 'variants.$.stock': -qty, stock: -qty } },   // see BUG-3 for the second $inc
  { new: true, session }
)
```

---

### BUG-3 · `product.stock` and `variants[].stock` drift apart

`product.stock` is a denormalized mirror written only at create/edit time
(`hooks/useAddProduct.ts:63`, `hooks/useProduct.ts:148`). Orders decrement one or the other,
never both, so the mirror is wrong the moment the first order lands. Shop and homepage read
the *sum of variants*, product detail reads *per-variant*, checkout validates against
*`product.stock`* — three different numbers for the same item.

**Decision required (recommend option A):**

- **A — Keep the mirror, always update both atomically.** In the same `$inc`, decrement
  `variants.$.stock` **and** `stock` (shown in BUG-2 above). Cheap, no read-path changes.
- **B — Drop `product.stock` for variant products** and compute the sum everywhere.
  Cleaner long-term but touches shop, homepage, cart, checkout, admin, and the schema.

Go with **A** now, consider B later.

**Data repair (one-off, run once after BUG-1/2/3 ship):** a script that, for every product
with variants, sets `stock = SUM(variants[].stock)`. Run it **after** the code fix, never
before — otherwise the drift immediately returns. Dry-run first, print a diff of every
product it would change, get sign-off, then apply.

---

### BUG-4 · Stock is never restored when an order is cancelled or deleted

`app/api/orders/[id]/route.ts` — `PATCH` (status change) and `DELETE` both just write to the
Order collection. Nothing calls `$inc` with a positive value anywhere in the repo.
Every cancelled order permanently burns inventory. Over months at 6k users, this alone
explains a large slice of the "stock is wrong" reports.

**Fix:**

1. Add a `stockRestored: { type: Boolean, default: false }` flag to the Order schema —
   this is the idempotency guard. Never restock twice.
2. On `PATCH` to `status: 'cancelled'` (from any non-cancelled status) and on `DELETE`:
   inside a transaction, `$inc` each line item back (`+quantity`, using `variantName` from
   BUG-1), set `stockRestored: true`, then save the order.
3. Guard: if `stockRestored === true`, skip. If a cancelled order is moved *back* to
   `confirmed`, re-decrement and set `stockRestored: false` — same transaction, same
   `$elemMatch` guard, and fail the status change if stock is insufficient.

---

### BUG-5 · `/api/fix-stock` is a public, unauthenticated endpoint that rewrites all inventory

`app/api/fix-stock/route.ts` — a plain `GET` with **no auth check**. Anyone who hits
`https://<yourdomain>/api/fix-stock` sets every zero-stock product and every zero-stock
variant to **10**. A search-engine crawler or a link preview bot can trigger it.

This is the single most dangerous thing in the repo and it may already be the cause of
"stock numbers randomly jump back up."

**Fix — do this in the very first hotfix deploy:** delete the route. If a repair tool is
genuinely needed, rebuild it as `POST /api/admin/fix-stock`, gated by `requireAdmin()`,
taking an explicit `{ productId, variantName, stock }` body — never a blanket `updateMany`.

**Also check the production access logs for hits on `/api/fix-stock`** before you delete it,
so you know whether historical stock data was corrupted and how often.

---

### BUG-6 · Order mutation APIs have no authorization at all

`middleware.ts:66` — `matcher: '/admin/:path*'`. It does **not** cover `/api/**`.
`app/api/orders/[id]/route.ts` never calls `requireAdmin()`. So any anonymous user can
`DELETE /api/orders/<id>` or flip any order's status.

`/api/admin/products/*` is fine — those routes call `requireAdmin()` explicitly. The order
routes were just missed.

**Fix:** add `const authError = await requireAdmin(); if (authError) return authError;` at
the top of `PATCH`, `DELETE`, and the admin `GET` in `app/api/orders/route.ts:279`
(that GET currently leaks every customer's name, email, phone, and address publicly —
treat it as a privacy incident, not just a bug).

---

## 2. HIGH — correctness and overselling

### BUG-7 · Order prices are taken from the client

`app/api/orders/route.ts:151` — `price: Number(prod.price)`, and `subtotal`, `shippingCost`,
`codFee`, `totalAmount` are all client-supplied. A crafted POST buys anything for 1 EGP.
The client-side "price refresh" in `CartContext` and checkout is cosmetic; it is not a control.

**Fix:** inside `createOrderTransaction`, the `findOneAndUpdate` already returns the product
document. Use it. Recompute `price` from `variant.price ?? product.price`, recompute
`subtotal`, re-validate the promo discount, recompute `shippingCost`/`codFee` from
`cityPricing` server-side, and recompute `totalAmount`. Ignore the client's numbers entirely —
or compare and reject with a 409 if they disagree, so you get telemetry on tampering.

### BUG-8 · Stale cache makes the storefront lie about stock

- `lib/cache-ttl.ts` — public products cached 5 min, product detail 10 min.
- `services/product.service.ts:35` — stale-while-revalidate serves *expired* data indefinitely
  if the background refresh keeps failing.
- **`createOrderTransaction` never calls `invalidateProductCache()`.** Nothing does, on the
  order path.

Result: a product sells out and the shop keeps advertising it as available for up to 10
minutes, generating a wave of "خلصت من الستوك" failures at the final checkout step.

**Fix:**
1. Call `invalidateProductCache(productId)` for each affected product after a successful
   order transaction commits (and after any restock from BUG-4).
2. Drop `PRODUCTS` TTL to ~30–60s and `PRODUCT_DETAIL` to ~30s. Stock is not a cacheable
   quantity at 10-minute granularity.
3. Consider serving product listings without the stock numbers and fetching stock from a
   tiny uncached `/api/products/stock?ids=...` endpoint. Best of both: fast cached content,
   always-live availability.

### BUG-9 · The in-memory cache does not work on serverless

`lib/cache.ts` is a per-process `Map`. On Netlify/Vercel each lambda instance has its own
copy, and instances are recycled constantly. Two users hitting two instances see two
different stock numbers, and `invalidateProductCache()` only clears **one** instance.
This is the "not scalable" part of the complaint.

**Fix (in order of effort):**
- Short term: the TTL reduction in BUG-8 bounds the divergence to ~30s.
- Proper fix: move the cache to Redis (Upstash works well on Netlify) or drop the cache for
  stock-bearing fields entirely and rely on MongoDB + a Next.js `revalidateTag`. The
  `revalidateTag('products')` calls already in the admin routes are the right pattern —
  the hand-rolled `Map` is what breaks.

### BUG-10 · Admin product edit clobbers concurrent stock changes (lost update)

`repositories/product.repository.ts:78` — `findByIdAndUpdate(id, data)` writes the **entire**
`variants` array that the admin's browser loaded minutes earlier, plus a `stock` value
computed in the browser. Any order that decremented stock between page-load and save is
silently erased.

**Fix:**
- Never send `stock` / `variants[].stock` from the generic product-edit form. Split
  inventory into its own endpoint: `PATCH /api/admin/products/:id/stock` that does an
  explicit `$inc` (delta) or a `$set` with an `expectedStock` precondition (optimistic lock),
  and returns 409 on mismatch so the admin sees "stock changed, reload."
- Add `updatedAt`-based optimistic concurrency to the main product PUT.

---

## 3. MEDIUM — consistency and UX

| # | Issue | Location | Fix |
|---|---|---|---|
| 11 | `/shop` and homepage add to cart with **no variant**, so the item decrements `product.stock` while `/product/[id]` adds it **with** a variant. Two code paths, two stock semantics, and the cart can hold the "same" product twice. | `app/shop/page.tsx:213`, `app/sections/Products.tsx:106` | For products with variants, don't add to cart from the grid — route to the product page to pick a variant. Only allow direct add for variant-less products. |
| 12 | `ProductClient.tsx:91` sets `variant: { name: v.name, color: v.name }` — name duplicated into color. Garbage in the order record and in `variantsMatch()`. | `ProductClient.tsx:91` | Send `color: undefined` unless there is a real colour field. |
| 13 | No server-side stock pre-check before the customer fills the whole checkout form. They only learn it's sold out after submitting. | checkout | Add a lightweight `POST /api/cart/validate` on checkout mount that returns per-line availability. Note: this is UX only — the transaction in `createOrderTransaction` remains the authority. |
| 14 | `MAX_FALLBACK_STOCK` in `app/cart/page.tsx:163` lets an item through with an invented stock ceiling when the API call fails. | cart | Block checkout on validation failure instead of guessing. |
| 15 | No low-stock alerting. The `Notification` model has a `'stock'` type that is never emitted. | `models/notification.ts:6` | After each decrement, if remaining stock crosses a threshold (e.g. ≤3), create a `type: 'stock'` notification. The admin UI already renders it (`notifications.tsx:110`). |
| 16 | `variants[].stock` has no `min: 0` (`models/product.ts:114`), unlike top-level `stock`. | product model | Add `min: 0`. Defence in depth behind the `$elemMatch` guard. |
| 17 | Variant names are not unique per product, and `variants.$` targets the first match. Two variants named "Black" = corrupted inventory. | product model + admin form | Validate uniqueness in `lib/schemas/product.schema.ts` and in the add/edit UI. |
| 18 | `models/order.ts:93` deletes and re-registers the Mongoose model on **every module load**. In a hot serverless environment this rebuilds the schema constantly and defeats Mongoose's model cache. | `models/order.ts:93` | Use the standard `mongoose.models.Order \|\| mongoose.model(...)` pattern, matching `models/product.ts:192`. |
| 19 | Legacy non-ObjectId product IDs are silently skipped for stock decrement (`orderCreationService.ts:39`) — the order completes and inventory is never touched. | order service | Now that static fallbacks are removed, this should **reject** the order with a clear error rather than sell untracked inventory. |
| 20 | `MONGO_BYPASS=true` accepts orders and returns success while writing nothing and decrementing nothing. | `app/api/orders/route.ts:9` | Verify it is `false`/unset in production. Consider making it refuse to start in a production build. |

---

## 4. Recommended architecture: one inventory module

Right now inventory logic is smeared across the order service, the email service, three
storefront components, and two admin hooks. Consolidate into `services/inventory.service.ts`
exposing exactly four functions, each transaction-aware:

```ts
reserveStock(items, session)    // atomic $elemMatch decrement, throws InsufficientStockError
releaseStock(items, session)    // atomic increment, idempotent via order.stockRestored
getAvailability(productIds)     // uncached, canonical read used by cart + checkout
adjustStock(productId, variantName, delta | {expected, next})  // admin, optimistic-locked
```

Everything else calls these. No other file in the codebase issues a `$inc` on stock.
That single rule is what makes this "professional" and keeps it correct as the team grows.

**Longer term (only if you outgrow the above):** an append-only `StockLedger` collection
(`productId, variantName, delta, reason, orderId, at`) with current stock derived from it.
Gives you a full audit trail and makes "why is this number wrong?" answerable in one query.
Not needed for 6k users; note it as the next step.

---

## 5. Ship order — staged, each stage independently deployable and revertible

**Stage 0 — Emergency hotfix (deploy today, ~1 hour of work)**
1. Delete `app/api/fix-stock/route.ts` (BUG-5). Check access logs first.
2. Add `requireAdmin()` to `PATCH`/`DELETE` in `app/api/orders/[id]/route.ts` and to the
   admin `GET` in `app/api/orders/route.ts` (BUG-6).
> Two small deletions/additions. No behaviour change for legitimate users. Very low risk.

**Stage 1 — Make stock actually decrement (the fix the business is asking for)**
3. `variantName = orderProduct.variant?.name ?? orderProduct.size` in
   `orderCreationService.ts` and `emailQueueService.ts` (BUG-1).
4. `$elemMatch` in the variant query (BUG-2).
5. Decrement `variants.$.stock` **and** `stock` in the same `$inc` (BUG-3, option A).
6. Add `variantName` to `OrderProductSchema` and persist it (BUG-1).
7. Call `invalidateProductCache(productId)` after the transaction commits (BUG-8.1).
> **Test before deploying:** in staging, place an order for a variant product and assert
> that `variants[i].stock` and `product.stock` both drop by exactly the quantity, and that
> a second order for more than the remaining stock is rejected. Then run two concurrent
> orders for the last unit and assert exactly one succeeds.

**Stage 2 — Reconciliation (run once, right after Stage 1 is verified live)**
8. Dry-run the `stock = SUM(variants[].stock)` repair script; review the diff with the
   business owner; then apply (BUG-3).
9. Manually reconcile against physical inventory — Stage 1 fixed the *future*, but months of
   BUG-1 and BUG-4 mean today's numbers cannot be trusted. Budget for a stock count.

**Stage 3 — Restock on cancel**
10. `stockRestored` flag + transactional release on cancel/delete/status-revert (BUG-4).

**Stage 4 — Trust the server, not the browser**
11. Server-side recomputation of price / subtotal / shipping / COD / total (BUG-7).
12. TTL reduction and the stock-out-of-cache split (BUG-8.2, BUG-8.3).

**Stage 5 — Scalability & admin safety**
13. Redis or `revalidateTag` instead of the per-process `Map` (BUG-9).
14. Dedicated stock endpoint with optimistic locking; remove stock from the product PUT (BUG-10).
15. Consolidate into `services/inventory.service.ts` (§4).

**Stage 6 — Polish**
16. Items 11–20 from the medium table.

---

## 6. Testing requirements (do not skip — this is what protects the 6k users)

`jest` is already configured (`jest.config.js`). Required tests before Stage 1 goes live:

1. **Variant decrement** — order 2 of variant "Red" → `variants.Red.stock -= 2` and
   `product.stock -= 2`. Other variants untouched.
2. **`$elemMatch` regression** — product `[{Black,0},{Red,50}]`, order 1 Black → must be
   **rejected**, and Red must remain 50. This test fails on today's code.
3. **Legacy `size`-only payload** — a payload with `size` and no `variant` still decrements
   the right variant (proves the backwards-compat fallback).
4. **Concurrency** — two simultaneous orders for the last unit; exactly one succeeds,
   final stock is 0, never negative.
5. **Rollback** — order fails on the second line item → the first item's stock is restored
   by the transaction (verifies `withTransaction` is really rolling back; requires a replica
   set — MongoDB Atlas is one, standalone local Mongo is not. Check your test setup).
6. **Cancel restock** — cancel → stock returns; cancel again → stock does **not** double-return.
7. **Price tampering** — POST with `price: 1` → order total is computed from the DB, not the body.

Also add a monitoring query the team can run daily during rollout:

```js
// products whose mirror has drifted from their variant sum
db.products.aggregate([
  { $match: { 'variants.0': { $exists: true } } },
  { $project: { name: 1, stock: 1, sum: { $sum: '$variants.stock' } } },
  { $match: { $expr: { $ne: ['$stock', '$sum'] } } }
])
```
Empty result = the system is healthy. Any row = something is still writing stock outside
the inventory module.

---

## 7. Rollback plan

Every stage is a self-contained commit. Stage 1 is the only one that changes write
behaviour on the hot path — before deploying it, take a `mongodump` of the `products`
collection so inventory can be restored to a known point. Deploy Stage 1 during a low-traffic
window and watch the order-failure rate and the drift query above for the first hour.
