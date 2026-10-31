import Link from 'next/link';
import { BadgeCheck, Star } from 'lucide-react';

import { t } from '@/i18n';
import { absoluteUrl, type Locale } from '@/lib/locale';
import { coachPath } from '@/coaches/seo';
import { headlineFor, isMadeUpHandle, type PublicCoach } from '@/coaches/schema';

import ShareChip from './ShareChip';
import ZoomImage from './ZoomImage';
import styles from './CoachProfile.module.css';

/** A plain text link: no border, no fill. */
const LINK = 'transition-colors hover:text-white';

/**
 * The top — Hatem's course-page picture (30 Oct 2026, fourth round):
 *
 *   Home / Coaches / Name                         Talk to us · Share
 *   [ wide cover ······························ 12 reviews ★ 4.8 ]
 *   [photo]  ← big, over the cover's corner
 *   Coach on Unlimited                       (the picture's "A course by")
 *   Name ✓                                   (the picture's title)
 *   his headline                             (one quiet line)
 *   ● Taking new athletes · 1,500 followers
 *   his bio, as normal paragraphs            (the picture's description)
 *
 * Every picture opens whole, in a new tab, when tapped. Plain <img>s, not
 * next/image: the platform's storage is not a configured image host, and
 * every Vercel transformation counts against the free 5,000 a month.
 */
export default function ProfileHeader({
  coach,
  locale,
}: {
  coach: PublicCoach;
  locale: Locale;
}) {
  const numbers = locale === 'ar' ? 'ar-EG' : 'en-GB';
  const contactPath = locale === 'ar' ? '/ar/contact' : '/contact';
  const homePath = locale === 'ar' ? '/ar' : '/';
  const headline = headlineFor(coach, locale) || t(locale, 'coach.headlineFallback');
  const bio = coach.bio?.trim();
  const rated = coach.averageRating !== null && coach.reviewCount > 0;

  return (
    <header>
      <nav className={`${styles.fine} mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-stone-500`}>
        <span className="flex min-w-0 items-center gap-2">
          <Link href={homePath} className={LINK}>
            {t(locale, 'breadcrumb.home')}
          </Link>
          <span aria-hidden className="text-stone-700">/</span>
          <span>{t(locale, 'coach.breadcrumb')}</span>
          <span aria-hidden className="text-stone-700">/</span>
          <span className="truncate text-stone-300">{coach.displayName}</span>
        </span>
        <span className="flex items-center gap-2">
          <Link href={contactPath} className={LINK}>
            {t(locale, 'coach.ask')}
          </Link>
          <span aria-hidden className="text-stone-700">·</span>
          <ShareChip
            url={absoluteUrl(coachPath(coach.username, locale))}
            title={coach.displayName}
            className={LINK}
            words={{
              share: t(locale, 'coach.share'),
              copied: t(locale, 'coach.linkCopied'),
              failed: t(locale, 'coach.copyFailed'),
            }}
          />
        </span>
      </nav>

      {/* The cover. No cover: a calm stone field, so the photo still has a corner to sit on. */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-gradient-to-br from-stone-800 to-stone-800/40 sm:aspect-[2/1]">
        {coach.coverUrl && (
          <ZoomImage
            src={coach.coverUrl}
            alt=""
            priority
            closeLabel={t(locale, 'coach.close')}
            wrapperClassName="absolute inset-0 h-full w-full"
            className="h-full w-full object-cover"
          />
        )}
        {rated && (
          <p
            className={`${styles.fine} pointer-events-none absolute bottom-3 end-3 flex items-center gap-2 rounded-full bg-stone-950/60 px-3 py-1.5 text-white backdrop-blur`}
          >
            <span className="opacity-80">
              {coach.reviewCount.toLocaleString(numbers)}{' '}
              {t(locale, coach.reviewCount === 1 ? 'coach.ratingOne' : 'coach.ratingMany')}
            </span>
            <span className="flex items-center gap-1 font-medium tabular-nums">
              <Star aria-hidden className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              {coach.averageRating!.toFixed(1)}
            </span>
          </p>
        )}
      </div>

      <div className="px-2 sm:px-6">
        <Photo coach={coach} closeLabel={t(locale, 'coach.close')} />

        <p className={`${styles.fine} mt-5 text-stone-500`}>
          {t(locale, 'coach.onUnlimited')}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2">
          <h1 className={`${styles.title} font-medium text-white`}>{coach.displayName}</h1>
          {coach.hasTick && (
            <BadgeCheck
              role="img"
              aria-label={t(locale, 'coach.tick')}
              data-testid="coach-tick"
              className="h-[18px] w-[18px] shrink-0 text-sky-400"
            />
          )}
          {/* Only a handle the coach chose; never the made-up `user_…` one. */}
          {!isMadeUpHandle(coach.username) && (
            <span dir="ltr" className={`${styles.item} text-stone-500`}>
              @{coach.username}
            </span>
          )}
        </div>

        <p className={`${styles.lead} mt-1 text-stone-300`}>{headline}</p>

        <p className={`${styles.fine} mt-3 flex flex-wrap items-center gap-x-2 text-stone-500`}>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${coach.isAcceptingAthletes ? 'bg-emerald-400' : 'bg-stone-600'}`}
            />
            {t(locale, coach.isAcceptingAthletes ? 'coach.accepting' : 'coach.notAccepting')}
          </span>
          <span aria-hidden>·</span>
          <span>
            {coach.followerCount.toLocaleString(numbers)} {t(locale, 'coach.followers')}
          </span>
        </p>

        {bio && (
          <p className={`${styles.body} mt-6 max-w-[62ch] whitespace-pre-line text-stone-400`}>
            {bio}
          </p>
        )}
      </div>
    </header>
  );
}

/** The photo: big, over the cover's corner, ringed in the page's stone. */
function Photo({ coach, closeLabel }: { coach: PublicCoach; closeLabel: string }) {
  const shape =
    'relative -mt-12 h-24 w-24 rounded-2xl ring-4 ring-stone-900 sm:-mt-14 sm:h-28 sm:w-28';

  if (!coach.avatarUrl) {
    return <div aria-hidden className={`${shape} bg-stone-700`} />;
  }

  return (
    <ZoomImage
      src={coach.avatarUrl}
      alt={coach.displayName}
      priority
      closeLabel={closeLabel}
      wrapperClassName={shape}
      className="h-full w-full rounded-2xl bg-stone-800 object-cover"
    />
  );
}
