import Link from 'next/link';
import { Award, BadgeCheck, MessageCircle } from 'lucide-react';

import { t } from '@/i18n';
import { absoluteUrl, type Locale } from '@/lib/locale';
import { certifiedBadge } from '@/coaches/certifications';
import { coachPath } from '@/coaches/seo';
import { headlineFor, type PublicCoach } from '@/coaches/schema';

import ShareChip from './ShareChip';
import styles from './CoachProfile.module.css';

/** The outlined chip: a link or a button in the first row. */
const CHIP =
  'inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-stone-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/**
 * The top of the page — the first picture: a small photo, the name and
 * @handle on one line, ONE big line under it, then the chips.
 *
 * Row one is what a visitor can do or needs to know first: is this coach
 * taking athletes, talk to us, share. Row two is quiet, filled chips — the
 * Certified badges, one per course passed (decision D7). They are read from
 * a view, so a revoked certificate disappears without a deploy.
 */
export default function ProfileHeader({
  coach,
  locale,
}: {
  coach: PublicCoach;
  locale: Locale;
}) {
  const contactPath = locale === 'ar' ? '/ar/contact' : '/contact';
  // A coach who wrote no headline still gets a line, never a hole.
  const headline =
    headlineFor(coach, locale) || t(locale, 'coach.headlineFallback');

  return (
    <header className="max-w-[560px]">
      <Avatar coach={coach} />

      <div className={`${styles.item} mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-0.5`}>
        <h1 className="font-semibold text-white">{coach.displayName}</h1>
        {coach.hasTick && (
          <BadgeCheck
            role="img"
            aria-label={t(locale, 'coach.tick')}
            data-testid="coach-tick"
            className="h-4 w-4 shrink-0 text-sky-400"
          />
        )}
        <span dir="ltr" className="text-stone-500">
          @{coach.username}
        </span>
      </div>

      <p className={`${styles.title} mt-2 max-w-[30ch] text-stone-100`}>
        {headline}
      </p>

      <div className={`${styles.fine} mt-5 flex flex-wrap gap-2`}>
        <StatusChip open={coach.isAcceptingAthletes} locale={locale} />

        <Link href={contactPath} className={CHIP}>
          <MessageCircle aria-hidden className="h-3.5 w-3.5" />
          {t(locale, 'coach.ctaButton')}
        </Link>

        <ShareChip
          url={absoluteUrl(coachPath(coach.username, locale))}
          title={coach.displayName}
          className={CHIP}
          words={{
            share: t(locale, 'coach.share'),
            copied: t(locale, 'coach.linkCopied'),
            failed: t(locale, 'coach.copyFailed'),
          }}
        />
      </div>

      {coach.certifications.length > 0 && (
        <ul
          className={`${styles.fine} mt-2 flex flex-wrap gap-2`}
          data-testid="certified"
        >
          {coach.certifications.map((certification) => (
            <li
              key={certification.courseId}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-stone-400"
            >
              <Award aria-hidden className="h-3.5 w-3.5" />
              {certifiedBadge(certification, locale)}
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

/**
 * The photo, 56 px. Above the fold, so it loads first (`fetchPriority`).
 *
 * A plain <img>, not next/image: these files live on the coaching
 * platform's storage, whose hostname this repo does not configure, and
 * every Vercel image transformation counts against the free 5,000 a month.
 */
function Avatar({ coach }: { coach: PublicCoach }) {
  if (!coach.avatarUrl) {
    return (
      <div
        aria-hidden
        className={`${styles.avatarBlank} h-14 w-14 rounded-full`}
      />
    );
  }

  return (
    <img
      src={coach.avatarUrl}
      alt={coach.displayName}
      width={56}
      height={56}
      fetchPriority="high"
      decoding="async"
      className="h-14 w-14 rounded-full bg-stone-800 object-cover"
    />
  );
}

/**
 * "Taking new athletes" — the fact an athlete came for, so it is the first
 * chip, with the one coloured edge on the page. Not a link: it is a fact,
 * and the way to act on it is the chip beside it.
 */
function StatusChip({ open, locale }: { open: boolean; locale: Locale }) {
  if (!open) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-stone-400">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-stone-500" />
        {t(locale, 'coach.notAccepting')}
      </span>
    );
  }

  return (
    <span
      className={`${styles.openChip} inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white`}
    >
      <span aria-hidden className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      {t(locale, 'coach.accepting')}
    </span>
  );
}
