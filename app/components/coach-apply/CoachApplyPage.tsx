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

          <section className={styles.cols}>
            <h2 className={styles.label}>{copy.getTitle}</h2>
            <div className={styles.body}>
              <p>
                {copy.get1a}
                <u>{copy.get1b}</u>
              </p>
              <p>{copy.get2}</p>
            </div>
          </section>

          <section className={styles.cols}>
            <h2 className={styles.label}>{copy.expectTitle}</h2>
            <div className={styles.terms}>
              {copy.terms.map((term, index) => (
                <div className={styles.term} key={term.title}>
                  {/* Numbered because it IS a sequence of commitments, in
                      the order they matter. */}
                  <div className={`${styles.termNumber} ${styles.latin}`}>
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <h3>{term.title}</h3>
                    <p>{term.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.cols} id="apply">
            <h2 className={styles.label}>{copy.applyTitle}</h2>
            <div className={styles.formWrap}>
              <ApplyForm locale={locale} confirmToken={confirmToken} />
            </div>
          </section>

          <div className={styles.strip}>
            <div>{copy.stripLeft}</div>
            <div><b>{copy.stripMiddle}</b></div>
            <div className={styles.latin}>unlimited-sw.com</div>
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
}
