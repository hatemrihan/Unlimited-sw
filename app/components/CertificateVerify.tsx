import Link from 'next/link';

import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { t } from '@/i18n';
import { directionFor, type Locale } from '@/lib/locale';
import {
  certificateDate,
  certificateVerifyPath,
  type CertificateVerdict,
} from '@/coaches/certifications';

/**
 * The page a QR on a certificate opens: /verify/<code>.
 *
 * WHO READS IT: not the coach. A gym owner, a client, an employer — a
 * stranger holding a phone, deciding whether to believe a piece of paper.
 * So the verdict is the first thing on the page, in one colour, and the
 * facts under it are the ones printed on the certificate, so the two can
 * be compared line by line. Nothing on it needs a sign-in.
 *
 * FOUR STATES, FOUR SENTENCES: valid (green), expired (amber), revoked
 * (red), unknown (grey). A system failure is "unknown" too — the stranger
 * is not our operator, and "try again later" would be read as "fake".
 *
 * The number is shown but never searched by: the code under the QR is the
 * key. A number is guessable; a code is not.
 */
export default function CertificateVerify({
  code,
  verdict,
  locale,
}: {
  code: string;
  verdict: CertificateVerdict;
  locale: Locale;
}) {
  const isArabic = locale === 'ar';
  const title = isArabic ? verdict.courseTitleAr || verdict.courseTitleEn : verdict.courseTitleEn || verdict.courseTitleAr;
  const tone = TONES[verdict.status];
  const formAction = isArabic ? '/ar/verify' : '/verify';

  return (
    <>
      <Nav />
      <main
        dir={directionFor(locale)}
        className="min-h-screen bg-stone-900 text-[#b3b3b3] pt-32 pb-24"
      >
        <div className="max-w-[640px] mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-white/40">
            {t(locale, 'verify.eyebrow')}
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-medium text-white">
            {t(locale, 'verify.title')}
          </h1>

          <section
            data-testid="verdict"
            data-status={verdict.status}
            className={`mt-8 border p-6 md:p-8 ${tone.border} ${tone.background}`}
          >
            <p className={`text-lg md:text-xl font-medium ${tone.text}`}>
              {t(locale, tone.titleKey)}
            </p>
            <p className="mt-2 text-sm text-white/70">{t(locale, tone.bodyKey)}</p>

            {verdict.status !== 'unknown' && (
              <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <Row label={t(locale, 'verify.holder')} value={verdict.holderName} strong />
                <Row label={t(locale, 'verify.course')} value={title} />
                <Row
                  label={t(locale, 'verify.number')}
                  value={verdict.number === null ? null : String(verdict.number)}
                />
                <Row label={t(locale, 'verify.issued')} value={certificateDate(verdict.issuedAt, locale)} />
                {verdict.validUntil && (
                  <Row label={t(locale, 'verify.validUntil')} value={certificateDate(verdict.validUntil, locale)} />
                )}
              </dl>
            )}

            <p className="mt-6 text-xs text-white/40">
              {t(locale, 'verify.code')}: <span className="font-mono text-white/70">{code}</span>
            </p>
          </section>

          {/* Another code, typed. A GET form, so the address bar ends up at
              /verify/<code> like a scan would — one page, one URL shape. */}
          <form
            action={formAction}
            method="get"
            className="mt-10 flex flex-col sm:flex-row gap-3"
          >
            <label className="sr-only" htmlFor="verify-code">
              {t(locale, 'verify.checkAnother')}
            </label>
            <input
              id="verify-code"
              name="code"
              placeholder={t(locale, 'verify.codePlaceholder')}
              autoComplete="off"
              className="flex-1 bg-transparent border border-white/20 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/60 uppercase"
            />
            <button
              type="submit"
              className="border border-white/30 px-6 py-3 text-sm text-white hover:bg-white hover:text-stone-900 transition-colors"
            >
              {t(locale, 'verify.checkAction')}
            </button>
          </form>

          <p className="mt-10 text-xs text-white/40">
            <Link href={isArabic ? '/ar/coaches/apply' : '/coaches/apply'} className="underline hover:text-white">
              {t(locale, 'coach.ctaButton')}
            </Link>
            {' · '}
            <Link href={certificateVerifyPath(code, isArabic ? 'en' : 'ar')} className="underline hover:text-white">
              {isArabic ? 'English' : 'العربية'}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

const TONES = {
  valid: {
    border: 'border-emerald-400/40',
    background: 'bg-emerald-400/5',
    text: 'text-emerald-300',
    titleKey: 'verify.validTitle',
    bodyKey: 'verify.validBody',
  },
  expired: {
    border: 'border-amber-400/40',
    background: 'bg-amber-400/5',
    text: 'text-amber-300',
    titleKey: 'verify.expiredTitle',
    bodyKey: 'verify.expiredBody',
  },
  revoked: {
    border: 'border-red-400/40',
    background: 'bg-red-400/5',
    text: 'text-red-300',
    titleKey: 'verify.revokedTitle',
    bodyKey: 'verify.revokedBody',
  },
  unknown: {
    border: 'border-white/15',
    background: 'bg-white/[0.03]',
    text: 'text-white/80',
    titleKey: 'verify.unknownTitle',
    bodyKey: 'verify.unknownBody',
  },
} as const;

function Row({ label, value, strong = false }: { label: string; value: string | null; strong?: boolean }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-white/40">{label}</dt>
      <dd className={strong ? 'text-white font-medium' : 'text-white/80'}>{value}</dd>
    </>
  );
}
