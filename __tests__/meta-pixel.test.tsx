/**
 * @jest-environment jsdom
 *
 * Meta Pixel bootstrap.
 *
 * Mirrors google-analytics.test.tsx: the important things to pin are that the
 * script stays OFF when unconfigured and that the CSP actually lets it load.
 * A CSP failure is silent — the first symptom is a month of zero events in
 * Ads Manager.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import MetaPixel from '../app/components/MetaPixel';

/* next/script uses useContext which requires the full app context. */
jest.mock('next/script', () => {
  return function MockScript(props: { id?: string; children?: string }) {
    return <script data-testid={props.id}>{props.children}</script>;
  };
});

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

/* Prevent the route tracker from actually calling the real pixel. */
jest.mock('../analytics/client/metaPixel', () => ({
  trackMetaPageView: jest.fn(),
}));

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('the bootstrap', () => {
  it('renders nothing when no pixel id is configured', () => {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;

    const { container } = render(<MetaPixel />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty pixel id', () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '';

    const { container } = render(<MetaPixel />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the bootstrap script when configured', () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '2956055868064274';

    const { container } = render(<MetaPixel />);

    expect(container).not.toBeEmptyDOMElement();

    const script = container.querySelector('script[data-testid="meta-pixel"]');
    expect(script).toBeTruthy();
    expect(script!.textContent).toContain('fbevents.js');
    expect(script!.textContent).toContain('2956055868064274');
    expect(script!.textContent).toContain("fbq('track', 'PageView')");
  });

  it('keeps a PageView fallback for visitors without JavaScript', () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '2956055868064274';

    const { container } = render(<MetaPixel />);

    // In jsdom (scripting-enabled) noscript children are not parsed into
    // the DOM tree.  The raw HTML of the container still contains them.
    const html = container.innerHTML;
    expect(html).toContain('noscript');
    expect(html).toContain('2956055868064274');
  });
});

describe('the content security policy', () => {
  const nextConfig = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
  const netlifyHeaders = readFileSync(join(process.cwd(), 'public', '_headers'), 'utf8');

  it('allows the Meta Pixel script to load, in the Next config', () => {
    expect(nextConfig).toContain('https://connect.facebook.net');
  });

  it('allows the Meta Pixel script to load, in the Netlify headers too', () => {
    expect(netlifyHeaders).toContain('https://connect.facebook.net');
  });

  it('still names its script sources rather than opening them up', () => {
    expect(nextConfig).not.toMatch(/script-src[^;"]*\*/);
    expect(netlifyHeaders).not.toMatch(/script-src[^;]*\*/);
  });
});

describe('independence from internal analytics', () => {
  it('does not import or reference NEXT_PUBLIC_ANALYTICS_ENABLED', () => {
    const source = readFileSync(
      join(process.cwd(), 'analytics', 'client', 'metaPixel.ts'),
      'utf8',
    );

    expect(source).not.toContain('ANALYTICS_ENABLED');
  });
});
