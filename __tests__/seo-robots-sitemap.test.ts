/**
 * @jest-environment node
 *
 * Locks in the SEO Phase 1 fixes that are easy to undo by accident.
 *
 * The one that actually cost us traffic: `public/robots.txt` existed and was 0
 * bytes. A static file in public/ wins over the app/robots.ts route, so
 * production served Cloudflare's managed block and nothing else — no Sitemap
 * line, and /admin left crawlable. Nothing in the build warns about that
 * collision, so this test is the warning.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import robots from '../app/robots';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('robots', () => {
  it('has no static public/robots.txt shadowing the route', () => {
    // If this fails, someone re-added the file and app/robots.ts is now dead code.
    expect(existsSync(join(root, 'public', 'robots.txt'))).toBe(false);
  });

  it('points crawlers at the sitemap', () => {
    expect(robots().sitemap).toBe('https://unlimited-sw.com/sitemap.xml');
  });

  it('keeps the admin panel and the API out of the index', () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    const disallow = ([] as string[]).concat(rule.disallow ?? []);

    expect(disallow).toEqual(expect.arrayContaining(['/admin/', '/api/']));
  });
});

// The sitemap talks to Mongo. Stub both so this stays a pure unit test — we are
// asserting which URLs the function emits, not that the database is up.
jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/product/model', () => ({
  __esModule: true,
  default: { find: () => ({ select: () => ({ lean: async () => [] }) }) },
}));

describe('sitemap', () => {
  it('lists the pages worth crawling and omits the ones that cannot rank', async () => {
    const sitemap = (await import('../app/sitemap')).default;
    const urls = (await sitemap()).map(e => e.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://unlimited-sw.com',
        'https://unlimited-sw.com/shop',
        'https://unlimited-sw.com/about',
        'https://unlimited-sw.com/contact',
        'https://unlimited-sw.com/terms',
        'https://unlimited-sw.com/policy',
        'https://unlimited-sw.com/refund',
      ])
    );

    // /cart and /checkout are noindex — advertising them burns crawl budget.
    expect(urls).not.toContain('https://unlimited-sw.com/cart');
    expect(urls).not.toContain('https://unlimited-sw.com/checkout');
  });
});

describe('root layout metadata', () => {
  const source = read('app/components/StoreShell.tsx');

  it('uses the agreed brand spelling', () => {
    expect(source).toContain('Unlimited SW');
    // The old all-caps hyphenated form must not come back — it split the brand
    // across two spellings in titles, OG tags and schema.
    expect(source).not.toContain('UNLIMITED-SW');
  });

  it('does not point OG previews at the old hero photo', () => {
    // /images/one-image.jpg is a 2160x3838 portrait — wrong shape for a 1200x630
    // social card, and it was silently cropped by every platform.
    expect(source).not.toContain('one-image.jpg');
  });
});

describe('social assets exist', () => {
  it.each(['public/og-image.jpg', 'public/logo.png'])('%s is present', (p) => {
    expect(existsSync(join(root, p))).toBe(true);
  });
});
