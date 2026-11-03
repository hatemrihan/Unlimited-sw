import Footer from '@/app/sections/Footer';
import Nav from '@/app/sections/Nav';

import styles from './CoachApply.module.css';
import { APPLY_COPY, type Locale } from './copy';
import ApplyForm from './ApplyForm';

/**
 * The public application page, in either language.
 *
 * Built on the same system as the contact page (app/contact/ConactClient.tsx):
 * Nav, stone-900, a centred column, a small bold title, underline inputs,
 * a full-width submit, Footer. One site, one look.
 *
 * The Arabic page is this same component with `dir="rtl"`; the stylesheet
 * uses logical edges only, so nothing is mirrored by hand.
 */
export default function CoachApplyPage({
  locale,
  confirmToken,
}: {
  locale: Locale;
  confirmToken?: string;
}) {
  const copy = APPLY_COPY[locale];
  const isArabic = locale === 'ar';

  return (
    <>
      <Nav />
      <main className={styles.board}>
        <div className={styles.card} dir={isArabic ? 'rtl' : 'ltr'}>
          <div className={styles.corners}>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <a className={styles.pill} href={isArabic ? '/coaches/apply' : '/ar/coaches/apply'}>
              {isArabic ? 'English' : 'العربية'}
            </a>
          </div>

          <h1 className={styles.headline}>
            {copy.headline[0]}
            <strong>{copy.headline[1]}</strong>
          </h1>

          <p className={styles.under}>{copy.under}</p>

          {/* One thing on the page: the form (3 Nov 2026 — the "what you
              get / what we expect" prose and the footer strip are gone). */}
          <section className={styles.cols} id="apply">
            <h2 className={styles.label}>{copy.applyTitle}</h2>
            <div className={styles.formWrap}>
              <ApplyForm locale={locale} confirmToken={confirmToken} />
            </div>
          </section>
        </div>
        <Footer />
      </main>
    </>
  );
}
