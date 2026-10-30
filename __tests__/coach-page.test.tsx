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
  coachDatabase: () => ({ from }),
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

import { CoachReadError, getCoachByUsername } from '../coaches/api';
import type { PublicCoach } from '../coaches/schema';
import CoachProfile from '../app/components/coach-profile/CoachProfile';
import { fillRows } from '../app/components/coach-profile/ProfileCards';

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
};

beforeEach(() => {
  from.mockClear();
  coachResult = { data: BARE_ROW, error: null };
  plansResult = { data: [], error: null };
  certsResult = { data: [], error: null };
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
    expect(coach?.displayName).toBe('user_41493a43');
    expect(coach?.programmes[0]).toMatchObject({
      descriptionEn: 'Pull-ups to the front lever.',
      descriptionAr: '',
      priceEgp: 1200,
    });
  });
});

describe('the wall has no holes', () => {
  const rowsEndFull = (spans: number[], columns: number, firstRow = columns) => {
    let free = firstRow;
    for (const span of spans) {
      if (span > free) return false;
      free -= span;
      if (free === 0) free = columns;
    }
    return free === columns;
  };

  it('the bare coach: rating, followers, one plan fill row two exactly', () => {
    expect(fillRows([1, 1, 1], 4, 3)).toEqual([1, 1, 1]);
    expect(fillRows([1, 1, 1, 1], 2)).toEqual([1, 1, 1, 1]);
  });

  it('a cover that does not fit stretches the card before it', () => {
    // Wide: plan 2 and the cover share row three; the cover takes the rest.
    expect(fillRows([1, 1, 1, 1, 2], 4, 3)).toEqual([1, 1, 1, 1, 3]);
    // Phone: plan 2 would sit alone beside a hole, so it goes full width.
    expect(fillRows([1, 1, 1, 1, 1, 2], 2)).toEqual([1, 1, 1, 1, 2, 2]);
  });

  it('ends every row full, whatever the coach filled in', () => {
    for (let plans = 1; plans <= 7; plans++) {
      for (let certs = 0; certs <= 3; certs++) {
        for (const cover of [false, true]) {
          const widths = [1, 1, ...Array(plans + certs).fill(1), ...(cover ? [2] : [])];
          expect(rowsEndFull(fillRows(widths, 4, 3), 4, 3)).toBe(true);
          expect(rowsEndFull(fillRows([1, ...widths], 2), 2)).toBe(true);
        }
      }
    }
  });
});

/** Every "#x" a pill points at has a card with id="x". */
function pillsLand(html: string) {
  const targets = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
  return { targets, missing: targets.filter((target) => !ids.has(target)) };
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
    expect(html).toContain('No programmes published yet.');
    expect(html).toContain('No reviews yet');
    expect(html).not.toContain('data-testid="certified"');
    expect(html).not.toContain('data-testid="coach-tick"');

    const { targets, missing } = pillsLand(html);
    expect(targets).toEqual(['about', 'plans', 'train']);
    expect(missing).toEqual([]);
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

    const { targets, missing } = pillsLand(html);
    expect(targets).toEqual(['about', 'plans', 'certificates', 'train']);
    expect(missing).toEqual([]);

    // The only links: four pills, "talk to us" in the chips, and the
    // Train card's button. Two plans on the page, zero plan links.
    expect(linkCount(html)).toBe(targets.length + 2);
  });
});
