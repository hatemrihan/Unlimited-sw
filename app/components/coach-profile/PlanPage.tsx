import Link from 'next/link';

import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { t } from '@/i18n';
import { directionFor, type Locale } from '@/lib/locale';
import { coachPath } from '@/coaches/seo';
import {
  isProgrammeLevel,
  programmeDescription,
  programmeTitle,
  type CoachProgramme,
  type PublicCoach,
} from '@/coaches/schema';

import ZoomImage from './ZoomImage';
import styles from './CoachProfile.module.css';

/**
 * One plan, on its own page (30 Oct 2026: "make the plans clickable, so
 * he can explore"). Plain text like the coach page: a back link to the
 * coach, the cover (tap to see it whole), the name, length · level ·
 * price, and the coach's full description.
 *
 * The weeks and days are not here: the platform shows them to signed-in
 * members only (get_plan_page_v1 is granted to `authenticated`), and the
 * store has no login. You join the plan in the app.
 */
export default function PlanPage({
  coach,
  programme,
  locale,
}: {
  coach: PublicCoach;
  programme: CoachProgramme;
  locale: Locale;
}) {
  const description = programmeDescription(programme, locale);
  const level = isProgrammeLevel(programme.level)
    ? t(locale, `coach.level.${programme.level}`)
    : programme.level;
  const facts = [
    programme.durationDays > 0
      ? `${programme.durationDays.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')} ${t(locale, 'coach.days')}`
      : null,
    level,
    `${programme.priceEgp.toLocaleString('en-US')} ${t(locale, 'product.currency')}`,
  ].filter(Boolean);

  return (
    <>
      <Nav />
      <main
        dir={directionFor(locale)}
        className={`${styles.page} min-h-screen bg-stone-900 pt-28 pb-24 text-stone-300 md:pt-32`}
      >
        <div className="mx-auto w-full max-w-[680px] px-4 sm:px-6">
          <nav className={`${styles.fine} mb-6 text-stone-500`}>
            <Link href={coachPath(coach.username, locale)} className="hover:text-white">
              {coach.displayName}
            </Link>
            <span aria-hidden> / </span>
            <span className="text-stone-400">{t(locale, 'coach.plans')}</span>
          </nav>

          {programme.coverUrl && (
            <ZoomImage
              src={programme.coverUrl}
              alt={programmeTitle(programme, locale)}
              priority
              closeLabel={t(locale, 'coach.close')}
              wrapperClassName="mb-6 w-full"
              className="aspect-[16/9] w-full rounded-2xl bg-stone-800 object-cover"
            />
          )}

          <h1 className={`${styles.title} font-semibold text-white`}>
            {programmeTitle(programme, locale)}
          </h1>
          <p className={`${styles.fine} mt-1 text-stone-500`}>{facts.join(' · ')}</p>

          {description && (
            <p className={`${styles.body} mt-4 max-w-[65ch] whitespace-pre-line text-stone-300`}>
              {description}
            </p>
          )}

          <p className={`${styles.fine} mt-6 text-stone-500`}>{t(locale, 'coach.joinInApp')}</p>

          {/* Who made it, and the way back: "View profile" is underlined so it reads as a link. */}
          <div className="mt-10 flex items-center gap-3">
            {coach.avatarUrl && (
              <img
                src={coach.avatarUrl}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 rounded-xl bg-stone-800 object-cover"
              />
            )}
            <div>
              <p className={`${styles.fine} text-stone-500`}>{t(locale, 'coach.by')}</p>
              <p className={`${styles.item} text-stone-100`}>
                {coach.displayName}
                <span aria-hidden className="text-stone-600"> · </span>
                <Link
                  href={coachPath(coach.username, locale)}
                  className="text-stone-300 underline underline-offset-4 hover:text-white"
                >
                  {t(locale, 'coach.viewProfile')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
