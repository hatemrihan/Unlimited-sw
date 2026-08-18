/**
 * @jest-environment jsdom
 *
 * The Google Analytics tag.
 *
 * Two things worth pinning, neither of them about GA working — that is visible
 * in GA's own realtime view within a minute of deploying.
 *
 * The first is that it stays OFF unless configured, so local development and
 * the test suite never report into the property the business reads its numbers
 * from. A polluted production property is not obvious and not undoable.
 *
 * The second is that the CSP actually allows it. A Content-Security-Policy
 * failure is silent in production — the script is blocked, the console warning
 * is in a browser nobody is looking at, and the first symptom is a month of
 * missing data.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import GoogleAnalytics from '../app/components/GoogleAnalytics';

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('the tag', () => {
  it('renders nothing when no measurement id is configured', () => {
    delete process.env.NEXT_PUBLIC_GA_ID;

    const { container } = render(<GoogleAnalytics />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty measurement id', () => {
    process.env.NEXT_PUBLIC_GA_ID = '';

    const { container } = render(<GoogleAnalytics />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('the content security policy', () => {
  const nextConfig = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
  const netlifyHeaders = readFileSync(join(process.cwd(), 'public', '_headers'), 'utf8');

  it('allows gtag.js to load, in the Next config', () => {
    expect(nextConfig).toContain('https://www.googletagmanager.com');
  });

  it('allows gtag.js to load, in the Netlify headers too', () => {
    // Two copies of the policy exist and both are served depending on the
    // route. A change to one and not the other is a policy that works in
    // development and blocks the script in production.
    expect(netlifyHeaders).toContain('https://www.googletagmanager.com');
  });

  it('still names its script sources rather than opening them up', () => {
    // The temptation when a third-party script is blocked is `script-src *`.
    // An open script-src turns any injection anywhere into a full compromise,
    // and this file exists partly to make that regression visible.
    expect(nextConfig).not.toMatch(/script-src[^;"]*\*/);
    expect(netlifyHeaders).not.toMatch(/script-src[^;]*\*/);
  });
});

describe('our own funnel', () => {
  it('does not depend on Google being reachable', () => {
    // A meaningful share of visitors block GA outright. The internal funnel is
    // the one that has to survive that, so nothing in analytics/ may reach for
    // gtag or dataLayer.
    const tracker = readFileSync(join(process.cwd(), 'analytics', 'queries.ts'), 'utf8');
    const schema = readFileSync(join(process.cwd(), 'analytics', 'schema.ts'), 'utf8');

    for (const source of [tracker, schema]) {
      expect(source).not.toContain('gtag');
      expect(source).not.toContain('dataLayer');
    }
  });
});
