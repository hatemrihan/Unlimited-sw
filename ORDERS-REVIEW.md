# Orders — Production Readiness Review

**Date:** 18 August 2026
**Scope:** the whole order path, front to back — 2,849 lines across 12 files, plus
the inventory engine, table columns, hooks and form validation they depend on.
**Method:** every file read in full. Every finding below is traced to a specific
line, and the ones that could be checked by grep were.

**Status: all 18 findings fixed.** See §16 for what was done against each, and
what was found along the way that this review had missed.

---

## 0. The short version

The **deep layer is genuinely good.** The order transaction is correct: real
MongoDB transactions, `$elemMatch` binding variant name and stock to the same
array element, promo usage claimed atomically inside the same transaction, an
idempotency flag on restock, cache invalidation by tag. That work holds up.

The problems are all in the **layers above and around it**:

- a completed, tested backend feature that **no UI can reach**;
- an **unindexed collection** the admin dashboard queries on every load;
- **input validation that only exists in the browser**;
- and a **frontend that discards the careful error messages the backend sends**.

Nine of the eighteen findings never throw an error. Consistent with the pattern
in the previous handoff: the expensive bugs here are the quiet ones.

---

## 1. 🔴 The order lifecycle is unreachable from the admin panel

**This is the biggest finding in the review.**

The backend is complete and careful. `PATCH /api/orders/[id]` validates the
status and routes each transition correctly:

- `→ cancelled` calls `restoreStockForOrder` (returns stock, transactional, idempotent)
- `cancelled →` anything calls `reapplyStockForOrder` (re-reserves, **409** if inventory moved on)
- any other change is a plain status write

Three client layers exist to drive it:

| Layer | File | Status |
|---|---|---|
| transport | `repositories/orderRepository.ts:27` `updateOrderStatus` | written |
| domain | `services/orderService.ts:25` `updateStatus` | written |
| hook | `hooks/useOrders.ts:64` `updateOrderStatus` | written |
| **UI** | — | **does not exist** |

Verified by grep: **nothing calls `updateOrderStatus`.** `app/admin/sections/orders.tsx:43`
destructures `{ orders, loadingOrders, totalPages, fetchOrders, deleteOrder }` —
it does not take `updateOrderStatus`. And `components/orders/OrderColumns.tsx`
has **no status column at all**: the columns are select, customer, orderId,
email, phone, address, products, color, paymentMethod, promoCode, receipt,
total, date, actions. The actions menu offers four copy-to-clipboard items, view
receipt, and delete.

**What this means in the shop today:**

- Every order sits at `pending` forever. `confirmed`, `shipped`, `delivered` are
  unreachable states.
- The admin **cannot see** an order's status — there is no column for it.
- The only way to act on an order is **`حذف الطلب` — permanent deletion.** That
  does restore stock (`deleteOrderWithStockRestoration`), so inventory stays
  correct, but the order record is destroyed: no history, no revenue record,
  nothing to reconcile against.

So the entire cancellation design — the transactional restock, the idempotency
flag, the 409 for "inventory moved on" — is **working code that nothing can
call.** The store is running its order book as a list that only grows and can
only be erased.

---

## 2. 🔴 The Order collection has no indexes

`models/order.ts` declares **no index** other than the implicit `_id` and
`orderId: { unique: true }`.

`GET /api/orders` (`app/api/orders/route.ts:388-393`) runs, on every dashboard load:

```ts
const totalCount = await Order.countDocuments({});          // full collection scan
const orders = await Order.find({})
  .sort({ createdAt: -1 })                                  // no index → in-memory sort
  .skip(skip)
  .limit(limit);
```

`{ createdAt: -1 }` has no index behind it, so MongoDB sorts **the entire orders
collection in memory on every single request** — and an in-memory sort is capped
at 32 MB. This is the *exact* bug already found and fixed for products
(`{ isActive: 1, price: 1 }`); orders was missed.

It degrades quietly: fine at 200 orders, slow at 5,000, and at some point the
dashboard starts returning `Sort exceeded memory limit` and simply stops loading.

`scripts/sync-product-indexes.js` covers the **products** collection only — it
creates `isActive_1_price_1` and `isActive_1_order_1` and touches nothing else.
There is no equivalent for orders.

Also unindexed and needed once search moves server-side (§8): `customer.phone`,
`customer.email`, `orderId`, `status`.

---

## 3. 🔴 Cancelling an order never gives the promo use back

`incrementPromoUsage` is claimed inside the order transaction — correct, and the
race is properly closed. But **nothing ever decrements it.**

- `restoreStockForOrder` — restores stock, flips `stockRestored`. No promo.
- `deleteOrderWithStockRestoration` — restores stock, deletes the order. No promo.

`services/promoService.ts:121` states the intent explicitly: *"a cancelled order
must not consume a use."* That holds for a **transaction rollback**. It does not
hold for the case that actually happens in a real shop: the order commits, and
the admin cancels it a day later.

A campaign limited to 100 uses will be silently consumed by cancelled and
deleted orders, and shut off early. Nothing logs it, nothing errors.

---

## 4. 🔴 Quantity is never validated, and three layers disagree about it

There is no integer check, no positive check, and no upper bound on `quantity`
anywhere on the server. Three code paths each coerce it differently:

| Layer | Line | Coercion |
|---|---|---|
| pricing | `orderPricingService.ts:100` | `Math.max(1, Number(q) \|\| 1)` |
| what gets stored | `app/api/orders/route.ts:238` | `Number(q) \|\| 1` |
| what gets reserved | `product/inventory.ts:63-64` | `Number(q) \|\| 0`, skipped if `<= 0` |

Two concrete consequences of the disagreement:

**`quantity: -5`** → priced as **1** · stored on the order as **−5** · **zero
stock reserved** (the line is skipped). The customer pays for one unit, the
warehouse is told nothing, and the admin sees a line reading `كمية: -5`.

**`quantity: 1.5`** → priced as **1.5** · reserved as `$inc: -1.5` → the
product's `stock` and the variant's `stock` become **fractional**. Every later
`$gte` comparison still works, so nothing errors; the number is just quietly
wrong from then on, and the reconciliation script has no integer to reconcile to.

The pricing mismatch check catches neither, because the client controls both the
quantity and the claimed subtotal and can make them agree.

---

## 5. 🟠 `GET /api/orders` will hand over every customer's personal data in one request

```ts
const page  = parseInt(url.searchParams.get('page')  || '1');   // no NaN guard
const limit = parseInt(url.searchParams.get('limit') || '50');  // no cap
```

- **`?limit=999999`** returns the entire orders collection — every customer's
  name, email, phone and full address — in a single response. There is no
  maximum.
- **`?page=abc`** → `parseInt` → `NaN` → `skip: NaN`. The same `parseInt` → `NaN`
  bug that was found and fixed in the products pagination; the orders route has
  it too.

The route *is* behind `requireAdmin()` — this is not an open door. It is a blast
radius: one leaked admin session becomes a complete customer database export in
one GET, rather than 80 paginated requests. The cap should be there regardless.

---

## 6. 🟠 The server never checks the email or the phone number

`app/api/orders/route.ts:117-131` checks only that the customer fields are not
empty strings. There is **no format validation on the server at all** — verified
by grep: the email and Egyptian-phone regexes exist only in
`app/checkout/hooks/useCheckoutForm.ts:89,97`, which runs in the browser.

A direct POST — or any client with JS disabled or modified — creates a real order
with `email: "x"`. The order commits, stock decrements, and then the confirmation
email fails to send. The customer has no confirmation, and for a cash-on-delivery
order there is no valid phone number to call them back on.

This also breaks the repo's own **convention #5** — *"Validation is zod, at the
route boundary."* `app/api/orders/route.ts` is roughly 100 lines of hand-written
`if` blocks (lines 93-182). Products and promo were migrated to zod; orders was
not.

---

## 7. 🟠 The admin's search silently lies

`app/admin/sections/orders.tsx` sets `manualPagination: true` — the server sends
one page of 50 — but also enables `getFilteredRowModel()` and
`getSortedRowModel()`, which filter and sort **only the 50 rows already loaded**.

A customer calls about their order. The admin types the name. If that order is on
page 3, the table renders:

> **لا توجد طلبات مطابقة للبحث.** *(No orders match the search.)*

That is a confident, wrong answer, with no indication that only 50 of 4,000
orders were searched. The admin will tell the customer their order does not
exist.

The column sort has the same flaw: "sort by total, descending" sorts the current
page, so the largest order on page 1 is presented as the largest order overall.

---

## 8. 🟠 Export says "all rows" and exports one page

```
`يتم تصدير كل الـ ${table.getFilteredRowModel().rows.length} صفوف`
```
*("exporting all N rows")*

`getFilteredRowModel()` is the loaded page. With 4,000 orders in the database the
dropdown reads *"exporting all 50 rows"* and produces a 50-row file. Anyone using
this for accounting gets a quietly incomplete export.

---

## 9. 🟠 The frontend throws away the backend's error messages

`repositories/orderRepository.ts`, on every one of its three methods:

```ts
if (!response.ok) {
  throw new Error(`Failed to update order: HTTP ${response.status}`);
}
```

The response **body is never read on failure.** So all of this work is discarded:

| What the server sends | What the admin sees |
|---|---|
| 409 + *"Not enough stock to re-reserve — inventory moved on, reload"* | `Failed to update order: HTTP 409` |
| 404 + *"Order not found"* | `Failed to update order: HTTP 404` |
| 500 + the real reason | `Failed to update order: HTTP 500` |

`app/api/orders/[id]/route.ts:63` picks 409-vs-500 deliberately so the admin can
tell "inventory changed" from "something broke". That distinction is deleted one
layer up. Same in `fetchOrders` and `deleteOrder`.

---

## 10. 🟠 Checkout is in English; its error messages are in Arabic

For an Egyptian store this is the most visible UX issue on the customer side.

- The form is **English, LTR**: "First Name", "Payment Method", "Cash on
  Delivery", "Order Submission Failed", "Your cart is empty".
- Client validation is **English**: "Invalid Egyptian phone number".
- Server errors are **Arabic**: `الأسعار اتغيرت. من فضلك حدّث الصفحة…`
- The stock warning is **Arabic, RTL** — inside an otherwise LTR English page
  (`app/checkout/page.tsx:293`).
- The admin panel is **fully Arabic RTL**.

So a customer filling in an English form gets a red box in Egyptian Arabic when
something goes wrong. The two languages are not split by audience — they are
split by *who wrote which line*.

---

## 11. 🟠 "Prices changed, refresh the page" — with nothing to press

On a pricing mismatch the server correctly refuses (409, `PRICING_MISMATCH`) and
tells the customer to refresh and review. The page then shows that message in a
red box and **does nothing else**:

- prices are not re-fetched,
- the cart is not revalidated,
- there is no "refresh prices" button,
- the customer is at the bottom of a filled-in form being told to reload it.

Refusing was the right call. The recovery path was never built.

**Related, same box:** an expired or invalid promo code is *silently ignored* in
`computeOrderPricing` (`orderPricingService.ts:131`). The order is then priced
without the discount, which no longer matches the client's total — so the
customer's actual failure, *"your promo code expired"*, is reported to them as
*"the prices changed."*

---

## 12. 🟡 Smaller items

| # | Finding | Where |
|---|---|---|
| 13 | A malformed order id throws a Mongoose `CastError`, caught by the generic handler and returned as **500 "Failed to update order"**. It is a bad request (400) or a missing order (404). | `[id]/route.ts:35,88` |
| 14 | **No rate limit on `POST /api/orders`.** The admin login door got a proper MongoDB-backed 5-attempt lock; the public order endpoint has nothing. Each attempt runs a transaction and an SMTP send. | `orders/route.ts:72` |
| 15 | Promo details are appended into the customer's own `notes` field, mixing system data into customer text — and it is already stored properly in `promoCode` and `discountAmount`. | `orders/route.ts:263` |
| 16 | The delete dialog warns the action is permanent but never says **stock will be returned to inventory** — the one consequence the admin most needs to know. | `orders.tsx:319` |
| 17 | `orderId` is `Date.now().slice(-6)` + 6 random chars. On collision the unique index throws 11000 → the customer is told "please try again" after their stock was already reserved and rolled back. A retry loop in the pre-save hook would make it invisible. | `models/order.ts:90-99` |
| 18 | The generic 500 handler returns `error.message` straight to the customer, leaking internal wording. Every other branch returns a fixed string. | `orders/route.ts:358` |

---

## 13. For the Postgres migration (session 3)

**Orders have no repository seam.** Products got one — `product/queries.ts` is
the only file in the product path that knows MongoDB exists, which is what makes
that migration survivable.

Orders never got the same treatment. `models/order.ts` is imported **directly**
by four files:

```
app/api/orders/route.ts
app/api/orders/[id]/route.ts
services/orderCreationService.ts
services/stockRestorationService.ts
```

Every one of them issues its own queries — `Order.find`, `Order.create`,
`Order.findById`, `Order.findByIdAndUpdate`, `Order.deleteOne`, `countDocuments`.
Mongo-specific behaviour is spread across all four: `withTransaction`,
`.session()`, `$inc`, `$elemMatch`, `$expr`, and Mongoose's `pre('save')` hook
for `orderId` generation.

An `order/queries.ts` mirroring `product/queries.ts` is the structural
prerequisite for session 3 — and it is worth doing **while fixing the items
above**, since most of them touch these same four files anyway. Doing it twice
would be the waste.

The Mongoose `pre('save')` hook deserves a specific note: order id generation
lives inside the ORM, so it silently disappears the moment the ORM changes.

---

## 14. Test coverage

Existing and good: `order-pricing`, `stock-decrement`, `stock-restoration`,
`inventory-service`, `promo-usage`.

Nothing covers: the orders **API routes** themselves (validation, pagination, the
limit cap), the promo-return-on-cancel gap (§3), quantity coercion (§4), or the
admin orders UI.

Following the pattern already used in this repo, the durable fix for §1 is a test
that fails if a handler exists with no caller — the same shape as
`admin-routes-guarded.test.ts`, which is what stopped the auth guards from
drifting.

---

## 15. Suggested order of work

Grouped so that each group touches one area and can ship on its own.

**A — Correctness, ship first**
1. Return the promo use on cancel and delete (§3)
2. Validate quantity once, at the boundary: positive integer, sane maximum (§4)
3. Cap `limit`, guard `parseInt` against NaN (§5)
4. Server-side zod for the order body, including email and Egyptian phone (§6)

**B — Make the feature reachable**
5. Status column + status actions in the admin table (§1)
6. Surface the API's error body instead of `HTTP 409` (§9)
7. Say "stock will be returned" in the delete dialog (§16)

**C — Database**
8. Indexes on `createdAt`, `status`, `orderId`, `customer.phone`, `customer.email`; extend the index script to orders (§2)
9. Move search, sort and export to the server, so they cover all orders (§7, §8)

**D — Customer-facing**
10. One language on the checkout page, end to end (§10)
11. A real recovery path for `PRICING_MISMATCH`, and tell the customer when it was actually the promo code that failed (§11)

**E — Structural, before session 3**
12. `order/queries.ts` as the single file that touches the database (§13)

---

---

## 16. What was done — 18 August 2026

All 18 findings fixed. **206 → 278 tests, all passing.** `tsc` clean, production
build clean, lint unchanged (the same 4 pre-existing issues in `utils/logger.ts`
and `utils/exportOrders.test.ts`).

| § | Finding | Fix |
|---|---|---|
| 1 | Lifecycle unreachable | Status column + per-order status menu; cancel/un-cancel confirm first and say what happens to stock |
| 2 | No indexes | 6 indexes in `order/model.ts`; `db:indexes` now covers orders; query plan asserted in tests |
| 3 | Promo use never returned | `releasePromoUsage`, guarded by the same `stockRestored` flag; un-cancel re-claims and refuses if the campaign filled up |
| 4 | Quantity unvalidated | One rule in `order/schema.ts`: positive integer, max 100/line, 50 lines/order |
| 5 | Unbounded `limit`, `NaN` page | `listOrdersQuerySchema` coerces and caps; every field falls back rather than throwing |
| 6 | No server-side email/phone | zod at the boundary; phone deliberately more forgiving than the form |
| 7 | Search lied | Search, filter and sort run in the database, across all orders |
| 8 | Export said "all rows" | Pages through every match server-side, capped at 5,000 with a warning |
| 9 | Error bodies discarded | `OrderApiError` carries the server's wording and its 409-ness end to end |
| 10 | Mixed language | Customer-facing strings English (storefront is English); admin stays Arabic |
| 11 | Mismatch dead end | "Update prices and review" button; `refreshPrices()` lifted out of the mount effect; expired promo now reported as itself (`PROMO_REJECTED`) |
| 13 | CastError → 500 | Order id shape checked first; 400 instead |
| 14 | No rate limit | `lib/throttle.ts`, 20 orders / 15 min per IP, **fails open** |
| 15 | Promo written into notes | Removed; it was already in `promoCode`/`discountAmount` |
| 16 | Delete dialog silent on stock | Says stock and promo return, and suggests cancelling instead |
| 17 | Weak `orderId` | Web Crypto, 10 hex chars; no fragile retry hook |
| 18 | Raw error to customer | Logged in full, fixed sentence returned |
| 12/§13 | No repository seam | `order/` folder — `queries.ts` is the only file touching MongoDB |

### Three things this review had missed

**The dashboard was worse than the orders list.** Capping `limit` broke
`/api/admin/orders?limit=1000`, which is how the regression surfaced. That
endpoint was downloading 1,000 complete orders — every customer's name, email,
phone and address — to compute four numbers in the browser, and bucketed the
chart by `getMonth()` alone, so August 2025 and August 2026 summed into one bar.
Replaced by `/api/admin/orders/stats`, aggregating in MongoDB. A `DEBUG:` block
was also rendering live in the admin dashboard.

**The first `orderId` fix was wrong.** A post-save retry hook failed with
`ParallelSaveError` — Mongoose refuses a `save()` re-entered from its own error
hook, so it broke in exactly the case it existed for. The test caught it. The
real defect turned out to be entropy: `Math.random().toString(36).substring(2,8)`
yields *at most* six characters and sometimes fewer.

**`InsufficientStockError` has two audiences.** It is read by customers placing
orders (English) and admins un-cancelling them (Arabic). It now carries
`productName`/`variantName` as fields so each side builds its own sentence.

### Two bugs the self-review caught afterwards

Both were introduced by this work, and both were found by re-reading the diff
rather than by anything failing.

**The schema would have taken the shop down.** `transactionScreenshot` was
declared `.optional()`, which accepts `undefined` and rejects `null` — and
`useCheckoutForm` initialises that field to `null`, only filling it in for
InstaPay. Every **cash-on-delivery** order, the majority of them, would have been
refused with *"expected string, received null"*. Nothing in development would
have shown it. Now `.nullish()`, normalised to `undefined`, and
`__tests__/order-real-payload.test.ts` pins the exact payload the checkout page
sends so no future tightening can do this again.

**Export could write out orders nobody selected.** TanStack Table identifies rows
by their index by default; with server-side pagination every page is indexed
0…49, so a row ticked on page 1 left the same position ticked on page 2. Once
export actually respected the selection, that became wrong data in a file used
for accounting. Fixed with `getRowId: row => row._id`, and the selection is
cleared when the search or filter changes.

### Verified, not assumed

Each new suite was checked by breaking the fix and confirming it went red:

- promo restoration → **7 of 12 failed** without `releasePromoUsage`
- order indexes → **all 6 failed** with the index declarations removed

Both restored and re-confirmed green afterwards.

### Still open

- **Nothing is committed.** This remains the largest risk.
- `npm run db:indexes` must be run after deploy — declaring an index does not
  create it.
- Customer-name search is an unanchored regex and therefore a scan by design,
  bounded by the page limit. A text index is the answer if it stops being cheap.
- The order transaction still lives in `services/`, by choice: `queries.ts` owns
  every statement, the services own what must succeed or fail together.
