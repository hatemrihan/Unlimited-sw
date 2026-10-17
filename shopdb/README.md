# shopdb — the store, selling from Supabase

The store has sold from MongoDB since 2025. This folder is what it sells from once one switch is turned: `SHOP_DB=supabase`. That's the same database the coaching app, the dashboard and the phone use (docs/SHOP-ORDERS-PLAN.md). **Until that variable is set, nothing here runs**, and the store behaves exactly as before. The 630 tests prove that.

## What changes at the switch

| | Before (`SHOP_DB` unset) | After (`SHOP_DB=supabase`) |
|---|---|---|
| Products, the shelf, product pages, the feed, the sitemap | MongoDB | `shop_products` + `shop_variants`. The same interface (`product/queries.ts`), so the pages don't change. A product keeps its OLD id publicly, so carts saved in browsers and old links keep working. |
| Checkout | a MongoDB transaction in `services/` | ONE call to `place_shop_order`, which prices, reserves stock, claims the promo, writes the customer, the order, its timeline and the owed email, or none of it. Same answers to the browser, including the two 409s. |
| Stock edits in the store's admin | `$inc` in MongoDB | `adjust_shop_stock`: the same two modes, the same lock, and an activity-log row |
| Promo codes, cities, a product's city pricing (store admin) | MongoDB | Supabase tables. Every edit is logged by the database. |
| Payment methods, the InstaPay address, free shipping (what checkout reads) | MongoDB + app_settings | `shop_payment_options`: ONE InstaPay address, the one in the dashboard's Settings |
| Confirmation emails | MongoDB queue | Sent right away as before. The safety net is `shop_email_outbox`, drained by the same Netlify job (old MongoDB rows are drained too, until empty). |
| **Orders, payments, customers, shop switches in the store's admin** | the store's admin | **the dashboard's `/shop`** (decision 16 Oct 2026). The store's endpoints answer `410` with the link. |
| Analytics, reviews, articles, sign-in throttling | MongoDB | MongoDB, unchanged |
| InstaPay receipt uploads | S3 | S3, unchanged. The dashboard shows S3 receipt links. |

## Files

| File | Job |
|---|---|
| `client.ts` | The switch (`sellsFromSupabase()`) and the server-only service-role connection. |
| `map.ts` | Every translation between the store's shapes and the database's, with no network (tested in `__tests__/shopdb-map.test.ts`). |
| `products.ts` | The catalogue behind `ProductQueries`; resolving old ids and new ones; stock through the door; city pricing. |
| `orders.ts` | Checkout through the door; the outbox drain. |
| `promos.ts` · `cities.ts` · `settings.ts` | The store admin's promos and cities; the checkout's switches. |
| `moved.ts` | The "this lives in the dashboard now" answer. |
| `../scripts/migrate-shop-to-supabase.ts` | The copy from MongoDB (look-only by default; `--write`; refuses a non-local database without `--production`). |
| `../scripts/shopdb-smoke.ts` | Twelve checks of this folder against a LOCAL Supabase. |

## The cutover, step by step (about 10 minutes, Hatem present)

**Before the day:**
1. **Netlify → Site → Environment variables:** add `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → Project settings → API keys → `service_role`), scope **Functions only**. Never "Builds" and never `NEXT_PUBLIC_`. Also add `DASHBOARD_URL` = the dashboard's address.
2. Rehearse the copy, look only: `npx tsx --env-file=.env.local scripts/migrate-shop-to-supabase.ts`. Every number should match and nothing should be listed under "to look at".
3. Decide the 352 "pending" orders (see the question below).

**On the day:**
1. Store admin → pause orders. Dashboard → Shop → Settings → "Pause new orders" stays on until the end.
2. Copy into production: `NEXT_PUBLIC_SUPABASE_URL=<project url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx --env-file=.env.local scripts/migrate-shop-to-supabase.ts --write --production`. Read the reconciliation: counts and money equal, recount 0.
3. Netlify: set `SHOP_DB=supabase`, then **Deploys → Trigger deploy**.
4. Smoke: open a product, add to the basket, check the delivery total, place a cash-on-delivery order, and see it in the dashboard's `/shop`. Cancel it there and watch the stock come back.
5. Dashboard → Shop → Settings: switch "Pause new orders" off. Switch "Show the shop in the app" on only now.
6. Keep MongoDB as it is, read-only, for 30 days.

**To go back** (if step 4 fails): set `SHOP_DB` back to `mongo` and redeploy. MongoDB was never written to after the pause, so it is exactly as it was.
