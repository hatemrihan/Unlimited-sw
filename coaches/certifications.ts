/**
 * ============================================================
 * unlimited-sw · coaches · certifications.ts
 * JOB: the two course facts the store shows — the Certified badges on a
 *      coach page, and the answer to "is this certificate real?" on
 *      /verify/<code>.
 * USED BY: coaches/api.ts (the badges), app/verify/[code]/page.tsx and
 *          its Arabic twin (the verdict), app/components/CertificateVerify.tsx.
 * DEPENDS ON: coaches/supabase.ts; the platform's view
 *             `public_certifications` and door `verify_certificate_v1`
 *             (migration 20261019200500).
 * RULES: · reads only, through a view and a door — never a table
 *        · a revoked or expired certificate is NOT in the view, so a
 *          badge vanishes by itself; the door says revoked / expired by
 *          name so the verify page can say it too
 *        · the QR carries the CODE, never the number: the number is for
 *          people, the code is for this page
 *        · the store never caches a verdict: a certificate revoked a
 *          minute ago must read "revoked" now
 * ============================================================
 */

import { coachDatabase } from './supabase';
import type { Locale } from '@/lib/locale';

/** One valid certification, as the badge shows it. */
export interface CoachCertification {
  courseId: string;
  titleEn: string;
  titleAr: string;
  number: number;
  issuedAt: string | null;
}

export type CertificateStatus = 'valid' | 'expired' | 'revoked' | 'unknown';

/** What `verify_certificate_v1` answers for one code. */
export interface CertificateVerdict {
  status: CertificateStatus;
  holderName: string | null;
  courseTitleEn: string | null;
  courseTitleAr: string | null;
  number: number | null;
  issuedAt: string | null;
  validUntil: string | null;
}

export const UNKNOWN_VERDICT: CertificateVerdict = {
  status: 'unknown',
  holderName: null,
  courseTitleEn: null,
  courseTitleAr: null,
  number: null,
  issuedAt: null,
  validUntil: null,
};

/** The wording of a badge: "Unlimited Certified · <course>" (decision D7). */
export const CERTIFIED_PREFIX = 'Unlimited Certified';

/** The badge's course title in the reader's language, falling back to the other. */
export function certificationTitle(
  certification: Pick<CoachCertification, 'titleEn' | 'titleAr'>,
  locale: Locale
): string {
  const preferred = locale === 'ar' ? certification.titleAr : certification.titleEn;
  const other = locale === 'ar' ? certification.titleEn : certification.titleAr;
  return (preferred?.trim() || other?.trim()) ?? '';
}

export function certifiedBadge(
  certification: Pick<CoachCertification, 'titleEn' | 'titleAr'>,
  locale: Locale
): string {
  return `${CERTIFIED_PREFIX} · ${certificationTitle(certification, locale)}`;
}

/** `/verify/K7Q2M9X4ZP` or `/ar/verify/K7Q2M9X4ZP` — what the QR and the app share. */
export function certificateVerifyPath(code: string, locale: Locale): string {
  const safe = encodeURIComponent(normaliseCode(code));
  return locale === 'ar' ? `/ar/verify/${safe}` : `/verify/${safe}`;
}

/** The door upper-cases and trims; doing it here too keeps the URL tidy. */
export function normaliseCode(code: string): string {
  return (code ?? '').trim().toUpperCase();
}

/**
 * Every valid certification of one person (the profiles id), newest first.
 *
 * Reads the view the mobile app's chip reads (`certified_chip.dart`), so
 * the two surfaces cannot disagree about who is certified. Any failure is
 * an empty list: a badge that cannot be confirmed is not shown.
 */
export async function certificationsFor(
  profileId: string
): Promise<CoachCertification[]> {
  try {
    const { data } = await coachDatabase()
      .from('public_certifications')
      .select('course_id, course_title_en, course_title_ar, number, issued_at')
      .eq('coach_id', profileId)
      .order('issued_at', { ascending: false });

    return (data ?? []).map((row) => ({
      courseId: String(row.course_id ?? ''),
      titleEn: String(row.course_title_en ?? ''),
      titleAr: String(row.course_title_ar ?? ''),
      number: Number(row.number ?? 0),
      issuedAt: row.issued_at ? String(row.issued_at) : null,
    }));
  } catch {
    return [];
  }
}

/**
 * The verdict for one code. Anything that is not a clean answer from the
 * door — a network failure, an odd shape, an empty code — is `unknown`,
 * which the page words as "we could not find this certificate" and never
 * as a system error: a stranger scanning a QR is not our operator.
 */
export async function verifyCertificate(code: string): Promise<CertificateVerdict> {
  const clean = normaliseCode(code);
  if (!clean) return UNKNOWN_VERDICT;
  try {
    const { data, error } = await coachDatabase().rpc('verify_certificate_v1', {
      p_code: clean,
    });
    if (error || !data || typeof data !== 'object') return UNKNOWN_VERDICT;
    return toVerdict(data as Record<string, unknown>);
  } catch {
    return UNKNOWN_VERDICT;
  }
}

/** The door's row → the verdict. Pure, so a test can hand in a shape. */
export function toVerdict(row: Record<string, unknown>): CertificateVerdict {
  const status = row.status;
  const known: CertificateStatus =
    status === 'valid' || status === 'expired' || status === 'revoked'
      ? status
      : 'unknown';
  if (known === 'unknown') return UNKNOWN_VERDICT;
  return {
    status: known,
    holderName: text(row.holder_name),
    courseTitleEn: text(row.course_title_en),
    courseTitleAr: text(row.course_title_ar),
    number: row.number === null || row.number === undefined ? null : Number(row.number),
    issuedAt: text(row.issued_at),
    validUntil: text(row.valid_until),
  };
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

/**
 * A date the way the reader writes it. Arabic readers see Arabic month
 * names; both see the Gregorian calendar, which is what the certificate
 * carries.
 */
export function certificateDate(iso: string | null, locale: Locale): string {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso.slice(0, 10);
  return at.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
