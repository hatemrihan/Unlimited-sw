import styles from './CoachApply.module.css';
import { APPLY_COPY, type Locale } from './copy';

/**
 * Where the approval email lands.
 *
 * ONE LINK IN THAT EMAIL, NOT THREE. An approval that arrives as a
 * decision — app here, dashboard there, and by the way read this — is a
 * chore. It arrives as a welcome and the page does the joining-up.
 *
 * It also carries the sentence that prevents the most likely support
 * problem we will have: sign in with the address you applied with. Sign in
 * with Apple offers "Hide My Email", and a relay address cannot match the
 * application, so the promotion silently does not fire and a brand-new
 * coach looks like an ordinary athlete. Said here, said in the email, and
 * `link_coach_application` exists in the database for when somebody does
 * it anyway.
 *
 * The app store links are deliberately absent until the apps are
 * published. This page can carry them the day they exist, without another
 * email being sent to anybody.
 */
export default function WelcomePage({ locale }: { locale: Locale }) {
  const copy = APPLY_COPY[locale];
  const isArabic = locale === 'ar';

  return (
    <div className={styles.board}>
      <div className={styles.card} dir={isArabic ? 'rtl' : 'ltr'}>
        <div className={styles.corners}>
          <div className={styles.mark}>
            <span className={styles.glyph} />
            <b className={styles.wordmark}>Unlimited</b>
          </div>
          <a
            className={styles.pill}
            href={isArabic ? '/coaches/welcome' : '/ar/coaches/welcome'}
          >
            {isArabic ? 'English' : 'العربية'}
            <i className={styles.dot} />
          </a>
        </div>

        <p className={styles.eyebrow}>{copy.welcomeEyebrow}</p>

        <h1 className={styles.headline}>
          {copy.welcomeHeadline[0]}
          <strong>{copy.welcomeHeadline[1]}</strong>
        </h1>

        <p className={styles.under}>{copy.welcomeUnder}</p>

        <div className={styles.rule} />

        <section className={styles.cols}>
          <div className={styles.label}>{copy.welcomeAppTitle}</div>
          <div className={styles.body}>
            <p>{copy.welcomeAppBody}</p>
          </div>
        </section>

        <div className={styles.rule} />

        <section className={styles.cols}>
          <div className={styles.label}>{copy.welcomeDashTitle}</div>
          <div className={styles.body}>
            <p>{copy.welcomeDashBody}</p>
            <p style={{ marginTop: 18 }}>
              <a className={styles.pill} href="https://admin.unlimited-sw.com">
                {copy.welcomeDashLink}
                <i className={styles.dot} />
              </a>
            </p>
          </div>
        </section>

        <div className={styles.rule} />

        <section className={styles.cols}>
          <div className={styles.label}>{copy.welcomeTroubleTitle}</div>
          <div className={styles.body}>
            <p>{copy.welcomeTroubleBody}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
