# payments/

Which payment methods the store offers. Small feature, but it decides whether
customers can pay at all, so it is treated like the money code it is.

```
payments/
├── model.ts      the schema, with a REAL single-document guarantee
├── settings.ts   read + write, caching, cache invalidation
├── schema.ts     zod validation for the admin write
└── README.md
```

Routes stay where they are, because a route's folder is its URL. Both are thin:

| Address | Who | Does |
|---|---|---|
| `GET/PUT /api/admin/payment-settings` | admin only | read fresh, write |
| `GET /api/payment-methods` | public | cached read for checkout |

## The caching rule

Checkout asks "may I offer Cash on Delivery?" on **every page load**. That was a
MongoDB round trip each time, for a document that changes about twice a year — on
the one page where slowness costs sales.

`getPaymentMethods()` goes through Next's Data Cache (60s, shared across every
serverless instance), and `updatePaymentMethods()` purges it by tag the moment an
admin saves. So it is fast *and* correct: a change appears immediately, it just
does not cost a query per visitor.

The admin screen uses `getPaymentMethodsUncached()` on purpose — showing a cached
value to the person about to change it is how two people overwrite each other.

## It fails OPEN, deliberately

If the database cannot be reached, reads return `{ codEnabled: true, instaPayEnabled: true }`
rather than throwing. Refusing to show any payment method would stop every order;
briefly offering one that was just switched off is far cheaper.

## Bugs this folder fixed

- **The single-document guarantee did not exist.** The old schema declared
  `index({}, { unique: true })` — an index on an EMPTY key, which constrains
  nothing and was never created (the live collection had only `_id_`). Nothing
  stopped a second settings document, and the admin GET *created* one whenever it
  found none: two simultaneous reads made two documents, after which `findOne({})`
  returned an arbitrary one. An admin could have switched Cash on Delivery off on
  a document checkout never read.
- **Reading wrote to the database.** Now the upsert is filtered on the unique key,
  so racing reads converge on one document.
- **`/api/payment-methods` was `force-dynamic`** — a query per checkout visit.
- **`/admin/payment-settings` was a 7-line stub** rendering only an `<h1>`, while
  `utils/navItems.tsx` linked to it — and opened it in a new tab. It now renders
  the real panel.
- **No validation and no accountability.** The write is zod-validated (`.strict()`,
  so a request cannot smuggle `instaPayEnabled: false` through) and records
  `updatedBy`.

## A trap worth remembering

`key` is deliberately **not** `immutable`. Mongoose silently discards updates to
an immutable path, so the pre-existing document could never be stamped with its
key — leaving it keyless and leaving room for a second document beside it. A test
caught this; do not add `immutable` back.

## Tests

`__tests__/payment-settings.test.ts` — the unique index is real, a second
document is rejected by MongoDB, eight simultaneous reads create exactly one
document, a legacy keyless document is adopted rather than duplicated, InstaPay
cannot be switched off, and `updatedBy` is recorded.
