# `order/`

Everything an order *is* and everything that reads or writes one. Addresses stay
in `app/`; the logic lives here.

```
route / page  →  services  →  queries.ts  →  MongoDB
```

| File | Owns |
|---|---|
| `model.ts` | The Mongoose schema, its indexes, and `generateOrderId()` |
| `schema.ts` | Zod validation for the request body and the admin list query |
| `queries.ts` | **The only file that touches the database** |
| `index.ts` | The public entry point — import from `@/order` |

The order *transaction* still lives in `services/orderCreationService.ts` and
`services/stockRestorationService.ts`. That is deliberate: `queries.ts` owns every
statement, the services own the business rule about what must succeed or fail
together.

---

## The rules

**1. Nothing outside `queries.ts` may touch the model.**

This is the whole point of the folder. Before it existed, `models/order.ts` was
imported directly by five files — both order routes, both stock services, and
the email module — and each issued its own `find`, `create`, `findByIdAndUpdate`,
`deleteOne`, `countDocuments` and `aggregate`. Mongo-specific behaviour
(`withTransaction`, `.session()`, `$inc`, `$elemMatch`, `$expr`, `$facet`) was
spread across all of them.

A Mongo → Postgres migration is planned. `product/queries.ts` is what makes that
survivable for products; this is the same seam for orders. Swap
`MongoOrderQueries` for a Postgres implementation and nothing above it changes.

**2. Validation is zod, at the route boundary, before anything reaches the
database.** See `schema.ts`.

**3. Stock only moves through `reserveStock` / `releaseStock`**, inside a
transaction. Orders never write stock directly.

**4. A promo use is claimed and returned in the same transaction as the order.**

---

## What each rule is protecting against

Every one of these was live in production. None of them threw an error.

### The order lifecycle was unreachable

`PATCH /api/orders/[id]` was complete and correct — cancel restored stock
transactionally, un-cancel re-reserved it and returned 409 if inventory had moved
on. Three client layers existed to call it. **Nothing did.** There was no status
column in the admin table and no action that invoked it, so every order sat at
`pending` forever and the only available operation was permanent deletion.

### The collection had no indexes

`GET /api/orders` runs `find({}).sort({ createdAt: -1 })` on every dashboard
load. With no index behind that sort, MongoDB sorted the entire collection in
memory, every time — and an in-memory sort is capped at 32 MB. Fine at 200
orders, slow at 5,000, then the dashboard stops loading altogether.

`model.ts` now declares one index per query the admin list can issue.
`__tests__/order-indexes.test.ts` asserts on MongoDB's own query plan: `IXSCAN`
present, `SORT` absent.

> Declaring an index does not create it. Run `npm run db:indexes` after deploy.

### Quantity was never validated, and three layers disagreed

| Layer | Coercion |
|---|---|
| pricing | `Math.max(1, Number(q) \|\| 1)` |
| stored order | `Number(q) \|\| 1` |
| `reserveStock` | `Number(q) \|\| 0`, skipped if `<= 0` |

`quantity: -5` was priced as **1**, stored as **−5**, and reserved **nothing**.
`quantity: 1.5` drove `$inc: -1.5` and left the product's stock permanently
fractional — a number that never errors and never reconciles.

`schema.ts` validates it once, so nothing downstream can see anything but a
positive integer.

### Contact details were only checked in the browser

The email and Egyptian-phone regexes lived in `useCheckoutForm.ts`. A direct POST
created a real order with `email: "x"` — stock decremented, then the confirmation
email failed to send, and a cash-on-delivery order had no valid number to call.

The server-side phone rule is deliberately *more* forgiving than the form
(`+20`, spaces and dashes are normalised rather than rejected). A server stricter
than its own form turns validation into lost orders.

### A cancelled order never gave its promo use back

`incrementPromoUsage` was claimed inside the order transaction. Nothing ever
decremented it. A campaign limited to 100 uses was silently consumed by cancelled
orders and shut off early.

Cancelling and deleting now call `releasePromoUsage`, guarded by the same
`stockRestored` flag as the stock, so it comes back exactly once. Un-cancelling
re-claims it, and **fails the status change** if the campaign filled up in the
meantime — pushing `usedCount` past `usageLimit` is the exact over-redemption the
atomic claim exists to prevent.

### `?limit=999999` returned the whole customer database

`parseInt` with no guard also turned `?page=abc` into `skip: NaN`.
`listOrdersQuerySchema` coerces and caps both.

### The admin's search silently lied

The table set `manualPagination: true` but filtered and sorted **client-side**,
over the 50 rows already loaded. Searching for a customer on page 3 rendered
*"لا توجد طلبات مطابقة للبحث"* — a confident wrong answer. Export had the same
flaw: it said "all rows" and produced one page.

Search, filter, sort and export all run against the database now.

---

## Language

The **storefront is English**, the **admin panel is Arabic**. Customer-facing
messages are written in English; admin-facing ones in Arabic.

`InsufficientStockError` is read by both — a customer placing an order and an
admin un-cancelling one. It therefore carries `productName` and `variantName` as
**fields**, and each side builds its own sentence. Do not translate its message
in place; rebuild it from the fields, as `adminStockMessage` does.

---

## Tests

| Suite | Holds |
|---|---|
| `order-validation` | quantity, email, phone, payment method, list-query caps |
| `order-indexes` | the query plan uses an index and does not sort in memory |
| `order-throttle` | the rate limit counts correctly and fails open; order ids do not collide |
| `promo-restoration` | a promo use returns on cancel/delete, exactly once |
| `order-pricing` | money is computed server-side |
| `stock-decrement`, `stock-restoration`, `inventory-service` | stock movement |

Each of these was checked by deliberately breaking the fix and confirming the
suite went red, then restoring it. A net nobody has tested is decoration.
