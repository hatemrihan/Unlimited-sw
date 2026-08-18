/**
 * Creates any missing indexes, then prints what each collection has.
 *
 *   node scripts/sync-indexes.js                 # against .env.local
 *   MONGODB_URI="..." node scripts/sync-indexes.js
 *
 * ADDITIVE ONLY. It calls createIndexes(), which adds what is missing and leaves
 * everything else alone. It deliberately does NOT call syncIndexes(), because
 * that DROPS any index not declared in the schema — including ones added by hand
 * in Atlas that nobody remembered to write down.
 *
 * Why run it at all: declaring an index in the schema does not create it in your
 * database. Mongoose builds indexes automatically on first use, but that means
 * the build happens during a real customer's request, at an unpredictable moment.
 * Running this once after deploy makes it deliberate and verifiable.
 *
 * Safe to run repeatedly — an index that already exists is left untouched.
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

/**
 * Every index this application depends on, by collection.
 *
 * Keep this in step with the `.index()` declarations in product/model.ts and
 * order/model.ts. The schema is what Mongoose builds lazily; this list is what
 * gets built on purpose.
 */
const INDEXES = {
  products: [
    // Storefront: filter isActive, sort by price. Without this the sort ran in
    // memory on every request.
    { key: { isActive: 1, price: 1 }, name: 'isActive_1_price_1', background: true },
    { key: { isActive: 1, order: 1 }, name: 'isActive_1_order_1', background: true },

    // Phase 2 slug routing. The product page looks a product up by slug, so
    // these are on the hot path for every product view.
    //
    // `sparse` is load-bearing, not an optimisation: every existing product has
    // no slug field, and a plain unique index treats them all as sharing the
    // value null and refuses to build. Same reason as orders.clientOrderId.
    {
      key: { slug: 1 },
      name: 'slug_1',
      unique: true,
      sparse: true,
      background: true,
    },
    {
      key: { slugAr: 1 },
      name: 'slugAr_1',
      unique: true,
      sparse: true,
      background: true,
    },

    // Category pages: filter by category, cheapest first.
    {
      key: { category: 1, isActive: 1, price: 1 },
      name: 'category_1_isActive_1_price_1',
      background: true,
    },
  ],

  orders: [
    // The admin list's default query: newest first. This is the one that was
    // sorting the whole collection in memory on every dashboard load.
    { key: { createdAt: -1 }, name: 'createdAt_-1', background: true },

    // Filtered by status, still newest first.
    { key: { status: 1, createdAt: -1 }, name: 'status_1_createdAt_-1', background: true },

    // The other sort options the table offers.
    { key: { orderDate: -1 }, name: 'orderDate_-1', background: true },
    { key: { totalAmount: -1 }, name: 'totalAmount_-1', background: true },

    // Admin search. Matched with an anchored ^ regex so these can be used.
    { key: { 'customer.phone': 1 }, name: 'customer.phone_1', background: true },
    { key: { 'customer.email': 1 }, name: 'customer.email_1', background: true },

    // The idempotency guard. Unlike the others this one is not an optimisation
    // — it is the mechanism itself. Without it a retried checkout becomes a
    // second order, because nothing else refuses the duplicate.
    //
    // `sparse` because every order already in this collection has no such
    // field; a plain unique index would read them all as sharing the value
    // null and refuse to build.
    {
      key: { clientOrderId: 1 },
      name: 'clientOrderId_1',
      unique: true,
      sparse: true,
      background: true,
    },
  ],

  pendingemails: [
    // The drain's only query: what is owed and due, oldest first. Without it
    // the scheduled function scans the whole collection every minute, forever,
    // and that collection only grows.
    {
      key: { status: 1, nextAttemptAt: 1 },
      name: 'status_1_nextAttemptAt_1',
      background: true,
    },

    // One row per order. This is what stops the inline send and the drain from
    // both deciding an email is owed and sending the customer two.
    {
      key: { orderId: 1 },
      name: 'orderId_1',
      unique: true,
      background: true,
    },
  ],
};

async function syncCollection(name, wanted) {
  const collection = mongoose.connection.collection(name);

  const before = await collection.indexes();
  console.log(`\n── ${name} ──`);
  console.log(`Indexes before (${before.length}):`);
  for (const index of before) {
    console.log(`  ${index.name}  ${JSON.stringify(index.key)}`);
  }

  await collection.createIndexes(wanted);

  const after = await collection.indexes();
  console.log(`Indexes after (${after.length}):`);
  for (const index of after) {
    console.log(`  ${index.name}  ${JSON.stringify(index.key)}`);
  }

  const added = after.length - before.length;
  console.log(added > 0 ? `✓ Added ${added} index(es).` : '✓ Nothing to add — already in place.');
  return added;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  console.log('Connecting…');
  await mongoose.connect(uri);

  let total = 0;
  for (const [name, wanted] of Object.entries(INDEXES)) {
    total += await syncCollection(name, wanted);
  }

  console.log(
    total > 0
      ? `\n✓ Done — ${total} index(es) added across ${Object.keys(INDEXES).length} collection(s).`
      : '\n✓ Done — everything was already in place.'
  );

  await mongoose.disconnect();
}

main().catch(async err => {
  console.error('Failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
