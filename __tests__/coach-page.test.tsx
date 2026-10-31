/**
 * @jest-environment node
 *
 * The coach page (redesigned 30 Oct 2026). Two promises are held here:
 *
 *   1. A failed read is an ERROR, never "no such coach" — otherwise a
 *      database hiccup becomes a 404 the CDN keeps for an hour.
 *   2. The page holds up with almost nothing filled in (the real
 *      user_41493a43 on production has no name, photo, bio or headline),
 *      every pill lands on a card, and plans are not links.
 */
import { renderToStaticMarkup } from 'react-dom/server';

type Result = { data: unknown; error: unknown };

let coachResult: Result;
let plansResult: Result;
let certsResult: Result;
let addressResult: Result;

// coach_address_v1: an old page address → the current one (30 Oct 2026).
const rpc = jest.fn((name: string, args: unknown) => {
  expect(name).toBe('coach_address_v1');
  expect(args).toHaveProperty('p_username');
  return { abortSignal: () => Promise.resolve(addressResult) };
});

const from = jest.fn((table: string) => {
  if (table === 'public_coaches') {
    return {
      select: () => ({
        eq: () => ({
          abortSignal: () => ({ maybeSingle: () => Promise.resolve(coachResult) }),
        }),
      }),
    };
  }
  if (table === 'plans') {
    return {
      select: () => ({
        eq: () => ({
          // archived plans are left out (30 Oct 2026)
          is: (column: string, value: unknown) => {
            expect([column, value]).toEqual(['archived_at', null]);
            return { order: () => ({ abortSignal: () => Promise.resolve(plansResult) }) };
          },
        }),
      }),
    };
  }
  return {
    select: () => ({ eq: () => ({ order: () => Promise.resolve(certsResult) }) }),
  };
});

jest.mock('../coaches/supabase', () => ({
  __esModule: true,
  coachDatabase: () => ({ from, rpc }),
}));
jest.mock('../app/sections/Nav', () => ({ __esModule: true, default: () => null }));
jest.mock('../app/sections/Footer', () => ({ __esModule: true, default: () => null }));
jest.mock(
  '../app/components/coach-profile/CoachProfile.module.css',
  () =>
    new Proxy(
      {},
      { get: (_target, key) => (key === '__esModule' ? false : String(key)) }
    )
);

import { CoachReadError, currentAddressFor, getCoachByUsername } from '../coaches/api';
import type { PublicCoach } from '../coaches/schema';
import CoachProfile from '../app/components/coach-profile/CoachProfile';

/** The row production returns for user_41493a43 today. */
const BARE_ROW = {
  coach_id: 'coach-1',
  profile_id: 'profile-1',
  username: 'user_41493a43',
  display_name: '',
  avatar_url: null,
  bio: null,
  cover_image_url: null,
  headline_en: null,
  headline_ar: null,
  is_accepting_athletes: true,
  review_count: 0,
  average_rating: null,
  follower_count: 0,
  has_tick: false,
};

const PLAN_ROW = {
  id: 'plan-1',
  slug: 'eight-weeks',
  title_en: '8 week strength',
  title_ar: 'قوة ٨ أسابيع',
  description_en: 'Pull-ups to the front lever.',
  description_ar: '',
  level: 'beginner',
  duration_days: 56,
  price_egp: '1200',
  cover_image_url: 'https://example.com/plan.jpg',
};

beforeEach(() => {
  from.mockClear();
  coachResult = { data: BARE_ROW, error: null };
  plansResult = { data: [], error: null };
  certsResult = { data: [], error: null };
  addressResult = { data: null, error: null };
});

describe('an old page address (30 Oct 2026)', () => {
  it('leads to the address the coach has now', async () => {
    addressResult = { data: 'omar_gamal', error: null };
    await expect(currentAddressFor('user_41493a43')).resolves.toBe('omar_gamal');
  });

  it('is null when the address never belonged to a coach', async () => {
    await expect(currentAddressFor('nobody')).resolves.toBeNull();
  });

  it('never redirects an address to itself', async () => {
    addressResult = { data: 'omar_gamal', error: null };
    await expect(currentAddressFor('omar_gamal')).resolves.toBeNull();
  });

  it('throws when the read fails — never a cached 404', async () => {
    addressResult = { data: null, error: { message: 'timeout' } };
    await expect(currentAddressFor('user_41493a43')).rejects.toBeInstanceOf(CoachReadError);
  });
});

describe('reading a coach', () => {
  it('is null when there is no such coach, and asks nothing more', async () => {
    coachResult = { data: null, error: null };
    await expect(getCoachByUsername('nobody')).resolves.toBeNull();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('throws when the coach read fails — never a 404', async () => {
    coachResult = { data: null, error: { message: 'timeout' } };
    await expect(getCoachByUsername('user_41493a43')).rejects.toBeInstanceOf(
      CoachReadError
    );
  });

  it('throws when the plans read fails — never "no programmes"', async () => {
    plansResult = { data: null, error: { message: 'boom' } };
    await expect(getCoachByUsername('user_41493a43')).rejects.toBeInstanceOf(
      CoachReadError
    );
  });

  it('carries the tick and the plan description', async () => {
    coachResult = { data: { ...BARE_ROW, has_tick: true }, error: null };
    plansResult = { data: [PLAN_ROW], error: null };
    const coach = await getCoachByUsername('user_41493a43');
    expect(coach?.hasTick).toBe(true);
    // No name: never the made-up handle (30 Oct 2026).
    expect(coach?.displayName).toBe('Unlimited coach');
    expect(coach?.programmes[0]).toMatchObject({
      descriptionEn: 'Pull-ups to the front lever.',
      descriptionAr: '',
      priceEgp: 1200,
    });
  });
});

/** The sections on the page, in order (plain text, no tabs — 30 Oct 2026). */
function sections(html: string) {
  return [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
}

function linkCount(html: string) {
  return (html.match(/<a /g) ?? []).length;
}

describe('the page', () => {
  it('holds up for the real bare coach', async () => {
    const coach = (await getCoachByUsername('user_41493a43')) as PublicCoach;
    const html = renderToStaticMarkup(<CoachProfile coach={coach} locale="en" />);

    expect(html).toContain('Calisthenics coach on Unlimited.');
    expect(html).toContain('Taking new athletes');
    expect(html).toContain('No plans on sale yet.');
    expect(html).toContain('No ratings yet. Athletes rate a coach in the app');
    expect(html).not.toContain('data-testid="certified"');
    expect(html).not.toContain('data-testid="coach-tick"');
    // The made-up handle is never printed on the page (30 Oct 2026).
    expect(html).not.toContain('user_41493a43</span>');
    expect(html).not.toContain('>@user_41493a43');

    expect(sections(html)).toEqual(['plans', 'ratings']);
    // No tabs, no hidden panels: everything is plain text on the page.
    expect(html).not.toContain('role="tab');
  });

  it('shows a full coach in Arabic, and the plans are not links', async () => {
    coachResult = {
      data: {
        ...BARE_ROW,
        display_name: 'Bar Claws',
        bio: 'Coach since 2019.',
        headline_ar: 'أدرّب الرياضيين على الحركات المتقدمة',
        has_tick: true,
        is_accepting_athletes: false,
        review_count: 12,
        average_rating: '4.8',
        follower_count: 1500,
        cover_image_url: 'https://example.com/cover.jpg',
      },
      error: null,
    };
    plansResult = {
      data: [PLAN_ROW, { ...PLAN_ROW, id: 'plan-2', level: 'all' }],
      error: null,
    };
    certsResult = {
      data: [
        {
          course_id: 'c1',
          course_title_en: 'Foundations',
          course_title_ar: 'الأساسيات',
          number: 7,
          issued_at: '2026-10-19T12:00:00+00:00',
        },
      ],
      error: null,
    };

    const coach = (await getCoachByUsername('user_41493a43')) as PublicCoach;
    const html = renderToStaticMarkup(<CoachProfile coach={coach} locale="ar" />);

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('أدرّب الرياضيين على الحركات المتقدمة');
    expect(html).toContain('data-testid="coach-tick"');
    expect(html).toContain('لا يستقبل متدربين جدد حاليًا');
    expect(html).toContain('4.8');
    expect(html).toContain('مبتدئ');
    expect(html).toContain('كل المستويات');
    // No Arabic description: the English one stands in, never a blank.
    expect(html).toContain('Pull-ups to the front lever.');
    expect(html).toContain('Unlimited Certified · الأساسيات');
    expect(html).toContain('https://example.com/cover.jpg');
    // The plan's own cover, and both plans written out.
    expect(html).toContain('https://example.com/plan.jpg');
    // Every plan opens its own page, in the reader's language.
    expect(html).toContain('href="/ar/coaches/user_41493a43/plans/plan-1"');
    expect(html).toContain('href="/ar/coaches/user_41493a43/plans/plan-2"');

    expect(sections(html)).toEqual(['plans', 'ratings', 'certificates']);

    // Links: Home, "talk to us", the two plans. Pictures are not links: they grow on the page.
    expect(linkCount(html)).toBe(4);
    expect(html).not.toContain(`target="_blank"`);
    expect(html).not.toContain('Download app');
  });
});
