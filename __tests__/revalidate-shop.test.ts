/**
 * @jest-environment node
 *
 * Store pages are cached for an hour, and refreshed at once when told to.
 *
 * WHY (17 Nov 2026): the Vercel account ran out of function time. The store
 * was 79% of it, and three quarters of the store's function runs were pages
 * rebuilding themselves — the home page, the shop and the product pages had
 * a cache lifetime of 30 to 60 seconds, and at the store's traffic nearly
 * every visit arrived after it had run out.
 *
 * The lifetime is now an hour. What keeps the pages correct is the purge:
 * the store purges on its own writes, and the admin dashboard calls
 * `/api/revalidate/shop` after its writes. This file guards both halves.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest } from 'next/server';

const revalidateTag = jest.fn();
jest.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  unstable_cache: (fn: unknown) => fn,
}));
jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));

import { POST } from '../app/api/revalidate/shop/route';
import { DATA_CACHE_SECONDS } from '../lib/cache-ttl';

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');

function call(secret?: string) {
  return POST(
    new NextRequest('https://store.test/api/revalidate/shop', {
      method: 'POST',
      headers: secret === undefined ? {} : { 'x-revalidate-secret': secret },
    })
  );
}

describe('POST /api/revalidate/shop', () => {
  const saved = process.env.STORE_REVALIDATE_SECRET;
  beforeEach(() => {
    revalidateTag.mockClear();
    process.env.STORE_REVALIDATE_SECRET = 'a-long-shared-secret';
  });
  afterAll(() => {
    process.env.STORE_REVALIDATE_SECRET = saved;
  });

  it('refuses when no secret is configured, and purges nothing', async () => {
    delete process.env.STORE_REVALIDATE_SECRET;
    const response = await call('anything');
    expect(response.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('refuses a missing or wrong secret, and purges nothing', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('a-long-shared-secreX')).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('purges every cache a store page is built from', async () => {
    const response = await call('a-long-shared-secret');
    expect(response.status).toBe(204);
    const purged = revalidateTag.mock.calls.map((c) => c[0]).sort();
    expect(purged).toEqual(['feedback', 'payment-settings', 'products', 'store-contact']);
  });
});

describe('store page cache lifetime', () => {
  it('is one hour', () => {
    expect(DATA_CACHE_SECONDS).toBe(3600);
  });

  it.each([
    ['app', '(en)', 'product', '[slug]', 'page.tsx'],
    ['app', 'ar', 'product', '[slug]', 'page.tsx'],
  ])('product pages are cached for an hour: %s/%s', (...parts) => {
    // Next needs a literal here, so the number is checked in the source.
    expect(read(...parts)).toMatch(/export const revalidate = 3600;/);
  });

  it('no product read is cached for less than the page that shows it', () => {
    // A page lives only as long as the shortest-lived data it reads. One
    // read left at 30 seconds puts every page that uses it back to 30.
    const actions = read('product', 'actions.ts');
    expect(actions).not.toMatch(/revalidate:\s*CACHE_TTL\./);
    expect(actions).toMatch(/revalidate:\s*DATA_CACHE_SECONDS/);
    expect(read('product', 'featured.ts')).toMatch(/revalidate:\s*DATA_CACHE_SECONDS/);
    expect(read('app', 'sections', 'feedback', 'reviews.ts')).toMatch(/revalidate:\s*DATA_CACHE_SECONDS/);
  });

  it('the home pages read the contact details through the hour-long cache', () => {
    for (const page of [read('app', '(en)', 'page.tsx'), read('app', 'ar', 'page.tsx')]) {
      expect(page).toMatch(/getStoreContactForPage\(\)/);
      expect(page).not.toMatch(/getStoreContact\(\)/);
    }
  });

  it('checkout still reads the contact details through the one-minute cache', () => {
    // The InstaPay address a customer pays to must never be an hour old.
    expect(read('app', 'api', 'payment-methods', 'route.ts')).toMatch(/getStoreContact\(\)/);
  });
});
