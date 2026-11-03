/**
 * The application page says what went wrong in the applicant's language,
 * and never "try again" when trying again cannot work (3 Nov 2026).
 */
jest.mock('@/coaches/supabase', () => ({ coachDatabase: jest.fn() }));

import { applyError, checkDraft, type ApplicationDraft } from '@/coaches/apply';

const pg = (message: string) => ({ message });

describe('coach application errors', () => {
  it('an open application already on file is said plainly', () => {
    const raw = pg('duplicate key value violates unique constraint "coach_applications_one_open_per_email"');
    expect(applyError(raw, 'en')).toMatch(/already have an application/);
    expect(applyError(raw, 'ar')).toMatch(/لديك طلب قائم/);
  });

  it('a slot taken in the same second asks for another time', () => {
    const raw = pg('duplicate key value violates unique constraint "coach_applications_one_open_per_slot"');
    expect(applyError(raw, 'en')).toMatch(/choose another/);
  });

  it('an unknown error falls back, never leaking Postgres', () => {
    expect(applyError(pg('P0001: boom'), 'en')).toBe('Something went wrong sending your application. Please try again.');
  });

  it('a complete draft passes the checks', () => {
    const draft: ApplicationDraft = {
      fullName: 'Omar Said', email: 'omar@example.com', phone: '+20 100 000 0000', city: 'Cairo',
      yearsCoaching: 6, birthday: '1995-05-01', specialities: 'Strength', portfolioUrl: 'instagram.com/omar',
      whyUs: 'I coach beginners at home.', slotId: null, honeypot: '',
    };
    expect(checkDraft(draft, 'en')).toBeNull();
    expect(checkDraft({ ...draft, email: 'nope' }, 'ar')).toMatch(/البريد/);
  });
});
