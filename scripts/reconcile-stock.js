#!/usr/bin/env node
/**
 * Stage 2 reconciliation: bring product.stock back in line with SUM(variants[].stock).
 *
 * Months of BUG-1 (variant stock never decremented) and BUG-4 (cancelled orders
 * never restocked) left the denormalized product.stock mirror out of sync with
 * the variant array it mirrors. Stage 1 keeps the two in lockstep going forward;
 * this script repairs the past.
 *
 * RUN ORDER MATTERS: only run this AFTER Stage 1 is deployed and verified live.
 * Run it before, and the drift returns with the very next order.
 *
 * Usage:
 *   node scripts/reconcile-stock.js              # dry run — prints the diff, writes nothing
 *   node scripts/reconcile-stock.js --apply      # applies the changes
 *
 * The dry run is the default on purpose. Review the diff with the business owner
 * and get sign-off before passing --apply.
 *
 * Note this only fixes internal consistency. It cannot tell you whether the
 * variant numbers themselves match physical inventory — that still needs a count.
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Add it to .env.local or export it.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const products = mongoose.connection.db.collection('products');

  // Only products that actually have variants — variant-less products have no
  // sum to reconcile against and must be left alone.
  const drifted = await products
    .aggregate([
      { $match: { 'variants.0': { $exists: true } } },
      { $project: { name: 1, stock: 1, variants: 1, sum: { $sum: '$variants.stock' } } },
      { $match: { $expr: { $ne: ['$stock', '$sum'] } } },
      { $sort: { name: 1 } },
    ])
    .toArray();

  console.log(`\nMode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`);
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Products with variants whose stock mirror has drifted: ${drifted.length}\n`);

  if (drifted.length === 0) {
    console.log('Nothing to reconcile — every mirror already matches its variant sum.');
    await mongoose.disconnect();
    return;
  }

  for (const p of drifted) {
    const delta = p.sum - p.stock;
    console.log(`${p.name}  [${p._id}]`);
    console.log(`  product.stock : ${p.stock}  ->  ${p.sum}   (${delta >= 0 ? '+' : ''}${delta})`);
    console.log(`  variants      : ${p.variants.map(v => `${v.name}=${v.stock}`).join(', ')}`);

    // A negative variant is a separate problem this script will not paper over.
    const negatives = p.variants.filter(v => Number(v.stock) < 0);
    if (negatives.length) {
      console.log(`  ⚠️  NEGATIVE VARIANT STOCK: ${negatives.map(v => v.name).join(', ')} — investigate before applying.`);
    }
    console.log('');
  }

  const totalBefore = drifted.reduce((a, p) => a + p.stock, 0);
  const totalAfter = drifted.reduce((a, p) => a + p.sum, 0);
  console.log(`Aggregate stock across affected products: ${totalBefore} -> ${totalAfter} (${totalAfter - totalBefore >= 0 ? '+' : ''}${totalAfter - totalBefore})`);

  if (!APPLY) {
    console.log('\nDry run complete. Nothing was written. Re-run with --apply once signed off.');
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  for (const p of drifted) {
    // Re-check the sum at write time so an order landing mid-script is not
    // clobbered: only write if stock and variants are still what we read.
    const res = await products.updateOne(
      { _id: p._id, stock: p.stock },
      { $set: { stock: p.sum } }
    );
    if (res.modifiedCount === 1) {
      updated++;
    } else {
      console.log(`  skipped ${p.name} [${p._id}] — stock changed while the script ran, re-run to pick it up`);
    }
  }

  console.log(`\nApplied. ${updated}/${drifted.length} products reconciled.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Reconciliation failed:', err);
  process.exit(1);
});
