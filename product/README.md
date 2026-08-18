# product/

Everything that defines what a product *is* and how it is read, written and
stocked. Consolidated from four scattered directories.

## The shape

```
product/
├── index.ts        the public door — new code imports from '@/product'
├── model.ts        the Mongoose schema and the Product type
├── schema.ts       Zod validation for create/update input
├── queries.ts      every database query, and nothing else
├── actions.ts      business rules + caching: get, create, update, delete
├── inventory.ts    stock: reserve, release, availability
└── tags.ts         cache tags that purge across all Netlify instances
```

Where each came from:

| Now | Was |
|---|---|
| `product/model.ts` | `models/product.ts` |
| `product/schema.ts` | `lib/schemas/product.schema.ts` |
| `product/queries.ts` | `repositories/product.repository.ts` |
| `product/actions.ts` | `services/product.service.ts` |
| `product/inventory.ts` | `services/inventory.service.ts` |
| `product/tags.ts` | `lib/product-tags.ts` |

Moved with `git mv`, so `git log --follow` still shows each file's full history.

## The layering

```
route / page  →  actions  →  queries  →  MongoDB
```

- **`queries.ts` is the only file that queries the database.** Swap it for a
  Postgres implementation and nothing above needs to change — which is the point,
  given the planned Mongo→Postgres migration.
- **`actions.ts` owns the rules and the caching.** Routes never query directly.
- **`inventory.ts` owns stock.** Stock moves only through `reserveStock` /
  `releaseStock`, inside a transaction.

## Two rules worth knowing before you edit anything

**1. The admin form must never write stock.**
`stripStockFromUpdate()` in `actions.ts` strips every stock field out of an
update and restores whatever the database currently holds, matching variants by
name. Without it, saving an edit writes back the variants the browser loaded
minutes ago and **erases any order placed in between** — silently un-selling real
orders. Stock changes go through `PATCH /api/admin/products/:id/stock`, which is
optimistically locked. Four tests cover this; do not weaken them.

**2. Cache invalidation must use tags, not the in-process Map.**
`lib/cache.ts` is a per-process Map. On Netlify each instance has its own copy,
so clearing it only affects the one instance that served the request — two
customers on two instances see two different numbers. `tags.ts` uses Next's Data
Cache, which `revalidateTag()` purges everywhere at once.

## What is NOT in here yet

API routes (`app/api/products/**`, `app/api/admin/products/**`) and the UI
(`app/admin/add-product`, `edit-product`, `delete-product`, `products/[id]/city-pricing`,
`app/shop`, `app/product/[id]`, `hooks/useProduct.ts`, `hooks/useAddProduct.ts`).

A URL in Next.js is defined by where its file sits, so routes and pages cannot
move here. The plan is the same as `email/`: the address stays, the logic moves
into `product/`, and the route becomes a thin adapter. **That work has not been
done, and the UI has no test coverage yet.**

## Fixed here

- **Real pagination.** `getActiveProductsPage()` pages in the database with
  `skip`/`limit`. The route used to read every product and `.slice()` in
  JavaScript, paying the full query cost for every page.
- **No more NaN paging.** `toPositiveInt()` turns junk into a sane default, so
  `?page=abc` no longer produces `slice(NaN, NaN)` and show a customer an empty
  shop.
- **Bounded reads.** `MAX_PAGE_SIZE` (100) and `MAX_BATCH_IDS` (100) cap how much
  one request can ask for. `/api/products/batch` previously accepted an unlimited
  list of ids.
- **Malformed ids are dropped, not fatal.** One stale `static-product-1` in a
  cart used to throw a CastError and fail the whole basket.

## Still open — needs a decision, not a patch

- **Index/sort mismatch.** The index is `{ isActive: 1, order: 1 }` but every
  storefront read sorts by `{ price: 1 }`, so MongoDB sorts in memory on every
  request. Two fixes: sort on `order` (uses the existing index) or add an
  `{ isActive: 1, price: 1 }` index (keeps cheapest-first). **They produce a
  different order on the shop page**, so this is a business decision.

## Tests

`__tests__/product-actions.test.ts` — 19 characterization tests pinning current
behaviour: active-only filtering, price sort, admin pagination and search, city
pricing defaults, and the four lost-update guards. They run against an in-memory
MongoDB replica set (transactions need one).

They were verified by deliberately breaking the sort and confirming the suite
caught it. A safety net nobody has tested is not a safety net.
