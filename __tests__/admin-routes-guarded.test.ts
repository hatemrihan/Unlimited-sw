/**
 * @jest-environment node
 *
 * Fails if any admin API route ships without an authorization check.
 *
 * Why this test exists: `middleware.ts` uses `matcher: '/admin/:path*'`, which
 * protects the admin *pages* but never runs on `/api/admin/...`. Every admin API
 * route must therefore guard itself, and five of them did not — leaving payment
 * configuration, customer feedback (name, email, phone) and order notifications
 * open to anyone on the internet.
 *
 * The unsafe thing was the default. This test makes forgetting the guard a build
 * failure instead of a silent hole.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ADMIN_API_DIR = join(process.cwd(), 'app', 'api', 'admin');

/**
 * Admin-only routes that do NOT live under app/api/admin.
 *
 * Watching only the `admin` folder is not enough: promo codes sit at
 * /api/promo and had no protection at all, so anyone could POST themselves a
 * 100%-off code — or simply GET the list of existing ones.
 *
 * Any route that creates, edits or lists something a customer could exploit
 * belongs in this list, wherever its folder happens to be.
 */
const ADMIN_ONLY_OUTSIDE_ADMIN_DIR: Array<{ file: string; handlers: string[] }> = [
  { file: 'app/api/promo/route.ts', handlers: ['GET', 'POST'] },
  { file: 'app/api/promo/[id]/route.ts', handlers: ['GET', 'PUT', 'PATCH', 'DELETE'] },

  // The admin product-image uploader. Its only caller is components/FileUpload,
  // used from the admin product forms — but it was open to anyone, accepted
  // 50MB of any content type, and wrote straight into the S3 bucket the
  // storefront serves from. An open write endpoint on a bucket somebody else
  // pays for is a free file host, and the bill is the owner's.
  { file: 'app/api/s3-upload/route.ts', handlers: ['POST'] },
];

/**
 * Routes outside the admin folder that are deliberately public, with the reason.
 */
const PUBLIC_BY_DESIGN: Record<string, string> = {
  'app/api/promo/validate/route.ts':
    'Checkout calls this to check a code a customer typed. It only reports whether a code is valid for a total — it creates and changes nothing.',
  'app/api/payment-methods/route.ts':
    'Checkout needs to know which payment methods are offered. Read-only, and exposes nothing but the two booleans.',
  'app/api/analytics/events/route.ts':
    'Browser telemetry. The visitors it counts have no account and never will, so no authentication is possible — that population IS the measurement. Protected instead by what works without identity: a zod allowlist with no field capable of holding personal data, a per-address rate limit, and a unique eventId so a replayed batch cannot inflate the funnel. Writes only; reads nothing back.',
};

/**
 * Routes that are deliberately public, with the reason.
 *
 * Adding to this list is a security decision — it needs a reason that survives
 * being read aloud, not a note that a test was failing.
 */
const INTENTIONALLY_PUBLIC: Record<string, string> = {
  'auth/route.ts': 'This IS the admin login. Requiring a session to log in would be a deadlock.',
  'check-auth/route.ts': 'Reports whether the caller is already signed in; returns no data either way.',
};

/** Every HTTP method Next.js will expose from a route file. */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function findRouteFiles(dir: string, base = ''): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const relative = base ? `${base}/${entry}` : entry;

    if (statSync(full).isDirectory()) {
      found.push(...findRouteFiles(full, relative));
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      found.push(relative);
    }
  }

  return found;
}

const routeFiles = findRouteFiles(ADMIN_API_DIR);

describe('admin API routes', () => {
  it('finds route files to check (guards against a broken glob silently passing)', () => {
    expect(routeFiles.length).toBeGreaterThan(10);
  });

  it.each(routeFiles)('%s requires an admin check', route => {
    if (INTENTIONALLY_PUBLIC[route]) return;

    const source = readFileSync(join(ADMIN_API_DIR, route), 'utf8');

    expect(source).toContain('requireAdmin');
  });

  it.each(routeFiles)('%s calls the check in every exported handler', route => {
    if (INTENTIONALLY_PUBLIC[route]) return;

    const source = readFileSync(join(ADMIN_API_DIR, route), 'utf8');

    for (const method of HTTP_METHODS) {
      // Matches `export async function GET(` and `export const GET = withDb(`.
      const exported = new RegExp(`export\\s+(async\\s+function|const)\\s+${method}\\b`);
      if (!exported.test(source)) continue;

      // The guard must appear inside that handler, not merely in the file: a
      // route with a guarded GET and an unguarded DELETE is still wide open.
      const start = source.search(exported);
      const nextHandler = HTTP_METHODS.map(m => {
        const re = new RegExp(`export\\s+(async\\s+function|const)\\s+${m}\\b`);
        const at = source.slice(start + 1).search(re);
        return at === -1 ? -1 : start + 1 + at;
      }).filter(at => at > start);

      const end = nextHandler.length > 0 ? Math.min(...nextHandler) : source.length;
      const body = source.slice(start, end);

      expect(body).toContain('requireAdmin');
    }
  });

  it('documents a reason for every intentionally public route', () => {
    for (const [route, reason] of Object.entries(INTENTIONALLY_PUBLIC)) {
      expect(routeFiles).toContain(route);
      expect(reason.length).toBeGreaterThan(30);
    }
  });
});

describe('admin-only routes outside app/api/admin', () => {
  it.each(ADMIN_ONLY_OUTSIDE_ADMIN_DIR)('$file guards every listed handler', ({ file, handlers }) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');

    for (const method of handlers) {
      const exported = new RegExp(`export\\s+(async\\s+function|const)\\s+${method}\\b`);
      expect(source).toMatch(exported);

      const start = source.search(exported);
      const laterHandlers = HTTP_METHODS.map(m => {
        const re = new RegExp(`export\\s+(async\\s+function|const)\\s+${m}\\b`);
        const at = source.slice(start + 1).search(re);
        return at === -1 ? -1 : start + 1 + at;
      }).filter(at => at > start);

      const end = laterHandlers.length > 0 ? Math.min(...laterHandlers) : source.length;

      expect(source.slice(start, end)).toContain('requireAdmin');
    }
  });

  it('keeps the deliberately public routes public, each with a written reason', () => {
    for (const [file, reason] of Object.entries(PUBLIC_BY_DESIGN)) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');

      // If one of these ever gains a guard, checkout breaks for real customers —
      // so the test fails in both directions.
      expect(source).not.toContain('requireAdmin');
      expect(reason.length).toBeGreaterThan(40);
    }
  });
});
