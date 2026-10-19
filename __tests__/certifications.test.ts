/**
 * @jest-environment node
 *
 * Certificates on the store (courses, 19 Oct 2026): the badges a coach page
 * shows come from the platform's public view; the verify page's verdict
 * comes from one door and is "unknown" whenever the door cannot answer
 * cleanly — a stranger scanning a QR must never see a system error read as
 * "fake". The wording for every state exists in both languages.
 */

const rpc = jest.fn();
const order = jest.fn();
const from = jest.fn(() => ({
  select: () => ({ eq: () => ({ order }) }),
}));

jest.mock('../coaches/supabase', () => ({
  __esModule: true,
  coachDatabase: () => ({ rpc, from }),
}));

import {
  certificationsFor,
  certifiedBadge,
  certificateVerifyPath,
  certificateDate,
  normaliseCode,
  toVerdict,
  verifyCertificate,
  UNKNOWN_VERDICT,
} from '../coaches/certifications';
import { t } from '../i18n';

beforeEach(() => {
  rpc.mockReset();
  order.mockReset();
  from.mockClear();
});

describe('the badges on a coach page', () => {
  it('reads the public view by the profile id, newest first', async () => {
    order.mockResolvedValue({
      data: [
        { course_id: 'c1', course_title_en: 'Foundations', course_title_ar: 'أساسيات', number: 7, issued_at: '2026-10-19T12:00:00+00:00' },
        { course_id: 'c2', course_title_en: 'Advanced', course_title_ar: '', number: 3, issued_at: null },
      ],
      error: null,
    });
    const badges = await certificationsFor('profile-1');
    expect(from).toHaveBeenCalledWith('public_certifications');
    expect(badges).toEqual([
      { courseId: 'c1', titleEn: 'Foundations', titleAr: 'أساسيات', number: 7, issuedAt: '2026-10-19T12:00:00+00:00' },
      { courseId: 'c2', titleEn: 'Advanced', titleAr: '', number: 3, issuedAt: null },
    ]);
    expect(certifiedBadge(badges[0], 'en')).toBe('Unlimited Certified · Foundations');
    expect(certifiedBadge(badges[0], 'ar')).toBe('Unlimited Certified · أساسيات');
    expect(certifiedBadge(badges[1], 'ar')).toBe('Unlimited Certified · Advanced');
  });

  it('shows no badge it cannot confirm', async () => {
    order.mockRejectedValue(new Error('fetch failed'));
    await expect(certificationsFor('profile-1')).resolves.toEqual([]);
    order.mockResolvedValue({ data: null, error: { message: 'nope' } });
    await expect(certificationsFor('profile-1')).resolves.toEqual([]);
  });
});

describe('the verify page', () => {
  const ROW = {
    status: 'valid', holder_name: 'Amr Hassan', course_title_ar: 'أساسيات', course_title_en: 'Foundations',
    number: 7, issued_at: '2026-10-19T12:00:00+00:00', valid_until: null,
  };

  it('asks the door with the trimmed, upper-cased code', async () => {
    rpc.mockResolvedValue({ data: ROW, error: null });
    const verdict = await verifyCertificate('  k7q2m9x4zp ');
    expect(rpc).toHaveBeenCalledWith('verify_certificate_v1', { p_code: 'K7Q2M9X4ZP' });
    expect(verdict).toEqual({
      status: 'valid', holderName: 'Amr Hassan', courseTitleEn: 'Foundations', courseTitleAr: 'أساسيات',
      number: 7, issuedAt: '2026-10-19T12:00:00+00:00', validUntil: null,
    });
  });

  it('is unknown for an empty code, a door error, a network failure or an odd shape', async () => {
    await expect(verifyCertificate('   ')).resolves.toEqual(UNKNOWN_VERDICT);
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(verifyCertificate('ABC')).resolves.toEqual(UNKNOWN_VERDICT);
    rpc.mockRejectedValue(new Error('fetch failed'));
    await expect(verifyCertificate('ABC')).resolves.toEqual(UNKNOWN_VERDICT);
    rpc.mockResolvedValue({ data: 'yes', error: null });
    await expect(verifyCertificate('ABC')).resolves.toEqual(UNKNOWN_VERDICT);
  });

  it('keeps revoked and expired as the door said, and nothing else leaks for unknown', () => {
    expect(toVerdict({ ...ROW, status: 'revoked' }).status).toBe('revoked');
    expect(toVerdict({ ...ROW, status: 'expired', valid_until: '2026-01-01T00:00:00+00:00' })).toMatchObject({ status: 'expired', validUntil: '2026-01-01T00:00:00+00:00' });
    expect(toVerdict({ status: 'unknown', holder_name: 'leak' })).toEqual(UNKNOWN_VERDICT);
    expect(toVerdict({ status: 'whatever', holder_name: 'leak' })).toEqual(UNKNOWN_VERDICT);
  });

  it('has a sentence for every state in both languages, and they differ', () => {
    for (const locale of ['en', 'ar'] as const) {
      const titles = (['valid', 'expired', 'revoked', 'unknown'] as const).map((s) => t(locale, `verify.${s}Title`));
      expect(new Set(titles).size).toBe(4);
      for (const title of titles) expect(title.trim()).not.toBe('');
    }
    expect(t('ar', 'verify.validTitle')).toBe('هذه الشهادة صالحة');
    expect(t('en', 'verify.revokedTitle')).toBe('This certificate was revoked');
  });

  it('builds the path the QR and the app share, in both languages', () => {
    expect(certificateVerifyPath('k7q2m9x4zp', 'en')).toBe('/verify/K7Q2M9X4ZP');
    expect(certificateVerifyPath('K7Q2M9X4ZP', 'ar')).toBe('/ar/verify/K7Q2M9X4ZP');
    expect(normaliseCode(' ab c ')).toBe('AB C');
  });

  it('writes the date the reader\'s way', () => {
    expect(certificateDate('2026-10-19T12:00:00+00:00', 'en')).toBe('19 October 2026');
    expect(certificateDate('2026-10-19T12:00:00+00:00', 'ar')).toContain('أكتوبر');
    expect(certificateDate(null, 'en')).toBe('');
    expect(certificateDate('garbage', 'en')).toBe('garbage');
  });
});
