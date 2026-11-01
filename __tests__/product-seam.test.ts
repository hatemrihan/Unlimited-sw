/**
 * @jest-environment node
 *
 * One file may talk to the products collection.
 *
 * `product/queries.ts` is the seam: the single place that knows the database is
 * MongoDB. Everything else asks it. The point is not tidiness — it is that a
 * migration to Postgres rewrites one file instead of hunting `ProductModel`
 * through routes, services, pages and scripts, and that nobody has to guess
 * whether some page is quietly running an uncached `find()` on every request.
 *
 * The product PAGE was doing exactly that: two Mongoose queries per view, with
 * no cache and no revalidate, on the page customers spend longest on.
 *
 * Importing the `Product` TYPE is fine and expected — that is the domain shape,
 * and it survives any database. What this test forbids is importing the
 * Mongoose MODEL, which is the part that will not.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();

/** Folders that are the seam itself, or not application code. */
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'product', '__tests__', 'coverage']);

/**
 * Files still reaching past the seam, each with the reason it is tolerated.
 *
 * This list is a to-do list, not an exemption scheme. Removing an entry is the
 * work; adding one needs a reason that survives being read aloud.
 */
const KNOWN_VIOLATIONS: Record<string, string> = {
  'app/sitemap.ts':
    'Build-time sitemap generation. Reads every active product once per build, not per request — the migration will move it, but it costs nothing today.',
  'app/api/admin/products/[id]/city-pricing/route.ts':
    'Admin-only write path for per-governorate pricing. Not on any customer request.',
  'app/api/admin/cities/route.ts':
    'Admin-only aggregate over city pricing, imported dynamically. Not on any customer request.',
  'services/orderCreationService.ts':
    'Dynamic import inside resolveLegacyProductIds, which is the last surviving legacy-id guard. Moves when that guard is finally deleted.',
};

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;

    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, found);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Whether this file imports the Mongoose model rather than just the type.
 *
 * `import { Product } from '@/product/model'` is a type import and allowed.
 * `import Product from '@/product/model'` and `await import('@/product/model')`
 * both take the model itself.
 */
function importsTheModel(source: string): boolean {
  const defaultImport = /import\s+(?!type\b)(\w+)\s*(?:,|from)[^;]*['"]@?\/?[\w./]*product\/model['"]/;
  const dynamicImport = /import\(\s*['"][^'"]*product\/model['"]\s*\)/;

  return defaultImport.test(source) || dynamicImport.test(source);
}

const offenders = walk(join(ROOT, 'app'))
  .concat(walk(join(ROOT, 'services')))
  .concat(walk(join(ROOT, 'lib')))
  .concat(walk(join(ROOT, 'components')))
  .filter(file => importsTheModel(readFileSync(file, 'utf8')))
  .map(file => relative(ROOT, file).split('\\').join('/'));

describe('the product seam', () => {
  it('is not bypassed by anything new', () => {
    const unexpected = offenders.filter(file => !(file in KNOWN_VIOLATIONS));

    expect(unexpected).toEqual([]);
  });

  it('has no stale entries in the to-do list', () => {
    // A file that has been fixed must leave the list, or the list stops
    // meaning anything and the next reader trusts it less than they should.
    const fixed = Object.keys(KNOWN_VIOLATIONS).filter(file => !offenders.includes(file));

    expect(fixed).toEqual([]);
  });

  it('no longer includes the public product page', () => {
    // The one that mattered: uncached, twice per request, on the busiest page.
    expect(offenders).not.toContain('app/product/[id]/page.tsx');
  });

  it('no longer includes the three server files that price and describe orders', () => {
    expect(offenders).not.toContain('services/orderPricingService.ts');
    expect(offenders).not.toContain('services/emailQueueService.ts');
    expect(offenders).not.toContain('app/api/checkout/cities/route.ts');
  });
});
