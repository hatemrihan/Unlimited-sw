/**
 * @jest-environment node
 *
 * The storefront must not carry a session.
 *
 * `SessionProvider` wrapped the whole application from the root layout, and
 * `Nav` — which renders on every page — called `useSession()`. Between them,
 * every anonymous shopper cost a `/api/auth/session` invocation on mount,
 * another every five minutes, and another every time they switched back to the
 * tab. None of it bought anything: the storefront has no accounts, checkout is
 * a guest flow, and the only people who ever sign in are admins.
 *
 * This is a source-level test on purpose. The cost is not visible in behaviour
 * — the site works either way — so nothing else would catch a re-introduction,
 * and it would come back as a one-line import in a file nobody re-reads.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function source(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

describe('the root layout', () => {
  it('does not wrap the application in a SessionProvider', () => {
    const layout = source('app', 'layout.tsx');

    expect(layout).not.toMatch(/<SessionWrapper|<SessionProvider/);
  });
});

describe('the admin layout', () => {
  it('exists, and is where the session lives', () => {
    const path = join(process.cwd(), 'app', 'admin', 'layout.tsx');
    expect(existsSync(path)).toBe(true);

    expect(source('app', 'admin', 'layout.tsx')).toMatch(/<SessionWrapper/);
  });
});

describe('SessionWrapper', () => {
  it('neither polls nor refetches on focus', () => {
    // middleware.ts re-checks the admin list on every /admin request and
    // requireAdmin re-checks it on every admin API call, so the client copy is
    // only ever used to show a name. A name does not need re-fetching.
    const wrapper = source('components', 'SessionWrapper.tsx');

    expect(wrapper).toMatch(/refetchInterval=\{0\}/);
    expect(wrapper).toMatch(/refetchOnWindowFocus=\{false\}/);
  });
});

describe('the storefront nav', () => {
  it('does not read the session', () => {
    const nav = source('app', 'sections', 'Nav.tsx');

    expect(nav).not.toContain('next-auth/react');
    expect(nav).not.toContain('useSession');
  });
});

describe('the home page product list', () => {
  it('does not force an uncached read of the paged endpoint', () => {
    // `no-store` here meant two MongoDB queries for every visitor to the page
    // most of them land on, while the endpoint behind it is now cached and
    // tagged — an order commit purges it within seconds.
    // Comments stripped first — the code explains why `no-store` was removed,
    // and a test that trips over its own explanation is worse than no test.
    const products = source('app', 'sections', 'Products.tsx')
      .split('\n')
      .filter(line => !line.trim().startsWith('//'))
      .join('\n');

    expect(products).not.toContain("cache: 'no-store'");
  });
});
