import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Award, CalendarDays, Infinity as Loop, Star } from 'lucide-react';

import { t } from '@/i18n';
import type { Locale } from '@/lib/locale';
import {
  CERTIFIED_PREFIX,
  certificateDate,
  certificationTitle,
} from '@/coaches/certifications';
import {
  isProgrammeLevel,
  programmeDescription,
  programmeTitle,
  type CoachCertification,
  type CoachProgramme,
  type PublicCoach,
} from '@/coaches/schema';

import styles from './CoachProfile.module.css';

/** Where each pill lands. One place, so a pill can never point at nothing. */
export const CARD_IDS = {
  about: 'about',
  plans: 'plans',
  certificates: 'certificates',
  train: 'train',
} as const;

/** Plan cards take turns through these, like the picture's mixed colours. */
const PLAN_TONES = [styles.yellow, styles.lilac, styles.sky];

/**
 * The wall of cards — the second picture.
 *
 * Four columns on a wide screen, two on a phone, in this reading order:
 *
 *   About (a folder, 2 wide)  ·  Status  ·  Train (tall on a wide screen,
 *                                           last and full width on a phone)
 *   Rating  ·  Followers  ·  one card per plan  ·  one per certificate
 *   ·  the cover photo, when there is one (2 wide)
 *
 * No holes: fillRows counts the cards and stretches one where a row would
 * otherwise end short, for each screen size. It runs here on the server,
 * so the browser gets finished widths and does no work.
 *
 * Plan cards are priced and deliberately NOT links: plans are bought in the
 * app, not in this shop's basket, and a card that looked clickable and went
 * nowhere would be a promise the store cannot keep. Only the Train card has
 * a button.
 */
export default function ProfileCards({
  coach,
  locale,
}: {
  coach: PublicCoach;
  locale: Locale;
}) {
  // Everything after the first row, in reading order, with its width.
  const flow: { width: number; card: (style: CSSProperties) => ReactNode }[] = [
    {
      width: 1,
      card: (style) => <RatingCard key="rating" coach={coach} locale={locale} style={style} />,
    },
    {
      width: 1,
      card: (style) => (
        <FollowersCard key="followers" count={coach.followerCount} locale={locale} style={style} />
      ),
    },
    ...(coach.programmes.length === 0
      ? [{ width: 1, card: (style: CSSProperties) => <NoPlansCard key="no-plans" locale={locale} style={style} /> }]
      : coach.programmes.map((programme, index) => ({
          width: 1,
          card: (style: CSSProperties) => (
            <PlanCard
              key={programme.id}
              id={index === 0 ? CARD_IDS.plans : undefined}
              programme={programme}
              tone={PLAN_TONES[index % PLAN_TONES.length]}
              locale={locale}
              style={style}
            />
          ),
        }))),
    ...coach.certifications.map((certification, index) => ({
      width: 1,
      card: (style: CSSProperties) => (
        <CertificateCard
          key={certification.courseId}
          id={index === 0 ? CARD_IDS.certificates : undefined}
          certification={certification}
          locale={locale}
          style={style}
        />
      ),
    })),
    ...(coach.coverUrl
      ? [{ width: 2, card: (style: CSSProperties) => <CoverCard key="cover" url={coach.coverUrl!} style={style} /> }]
      : []),
  ];

  const widths = flow.map((item) => item.width);
  // Phone: two columns, and Status flows with the rest (About is alone in
  // row one, Train goes last). Wide: four columns, Status sits in row one,
  // and row two has three places because the tall Train card holds the
  // fourth.
  const phone = fillRows([1, ...widths], 2);
  const wide = fillRows(widths, 4, 3);

  // Each card rises a beat after the one before (CSS); capped so a long
  // wall does not keep its last cards waiting.
  let order = 0;
  const place = (span: number, spanWide: number) =>
    ({
      '--i': Math.min(order++, 8),
      '--span': span,
      '--span-lg': spanWide,
    }) as CSSProperties;

  return (
    <div className={`${styles.grid} mt-6`}>
      <AboutCard bio={coach.bio} locale={locale} style={place(2, 2)} />
      <StatusCard open={coach.isAcceptingAthletes} locale={locale} style={place(phone[0], 1)} />
      <TrainCard locale={locale} style={place(2, 1)} />
      {flow.map((item, index) => item.card(place(phone[index + 1], wide[index])))}
    </div>
  );
}

/**
 * How many columns each card spans so that no row ends short.
 *
 * Cards are laid left to right. When one does not fit in what is left of
 * a row, the card before it stretches over the rest and the next row
 * begins; the last card stretches to finish the last row. `firstRow` is how
 * many places the first row has (fewer when a tall card holds some).
 *
 *   fillRows([1, 1, 1, 1, 2], 4, 3)  →  [1, 1, 1, 1, 3]
 */
export function fillRows(widths: number[], columns: number, firstRow = columns): number[] {
  const spans = widths.map((width) => Math.min(width, columns));
  let free = firstRow;
  let previous = -1; // the card before, in this row; -1 at a row's start

  spans.forEach((width, index) => {
    if (width > free) {
      if (previous >= 0) spans[previous] += free;
      free = columns;
    }
    free -= width;
    previous = index;
    if (free === 0) {
      free = columns;
      previous = -1;
    }
  });

  if (previous >= 0) spans[previous] += free;
  return spans;
}

/**
 * About — the blue folder. Holds the coach's own words; a coach who wrote
 * none gets the empty folder with its label, exactly as in the picture.
 */
function AboutCard({
  bio,
  locale,
  style,
}: {
  bio: string | null;
  locale: Locale;
  style: CSSProperties;
}) {
  const words = bio?.trim();

  return (
    <div id={CARD_IDS.about} className={styles.folder} style={style}>
      <svg aria-hidden viewBox="0 0 160 22" className={styles.folderTab}>
        <path
          d="M0 22V12Q0 0 12 0H116Q126 0 132 7L143 18Q147 22 155 22Z"
          fill="currentColor"
        />
      </svg>
      <div className={styles.folderBody}>
        {/* Heading first for screen readers; drawn last, as a label. */}
        <h2
          className={`${styles.fine} order-last mt-auto self-end rounded-md bg-[#f5d679] px-2 py-0.5 font-medium text-stone-900`}
        >
          {t(locale, 'coach.about')}
        </h2>
        {words && (
          <p className={`${styles.body} max-w-[60ch] whitespace-pre-line pb-4 text-stone-900/85`}>
            {words}
          </p>
        )}
      </div>
    </div>
  );
}

/** Taking athletes or not — the cream card, with a small coloured tile. */
function StatusCard({
  open,
  locale,
  style,
}: {
  open: boolean;
  locale: Locale;
  style: CSSProperties;
}) {
  return (
    <div className={`${styles.card} ${styles.cream}`} style={style}>
      <p className={styles.title}>
        {t(locale, open ? 'coach.accepting' : 'coach.notAccepting')}
      </p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <p className={`${styles.fine} text-stone-500`}>{t(locale, 'coach.rightNow')}</p>
        <span
          aria-hidden
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${open ? 'bg-[#d9f99d]' : 'bg-stone-200'}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${open ? 'bg-emerald-600' : 'bg-stone-400'}`} />
        </span>
      </div>
    </div>
  );
}

/** The one call to action — deep red, tall, with the button. */
function TrainCard({ locale, style }: { locale: Locale; style: CSSProperties }) {
  const contactPath = locale === 'ar' ? '/ar/contact' : '/contact';

  return (
    <div id={CARD_IDS.train} className={`${styles.card} ${styles.red} ${styles.train}`} style={style}>
      <Loop
        aria-hidden
        strokeWidth={1}
        className="pointer-events-none absolute -bottom-8 -end-8 h-44 w-44 text-white/10"
      />
      <h2 className={styles.title}>{t(locale, 'coach.ctaTitle')}</h2>
      <p className={`${styles.body} mt-2 max-w-[40ch] opacity-75`}>
        {t(locale, 'coach.ctaBody')}
      </p>
      <div className="relative mt-auto pt-6">
        <Link
          href={contactPath}
          className={`${styles.item} inline-flex items-center gap-1.5 rounded-full bg-[#fbeee0] px-4 py-2 font-medium text-[#8b1d17] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]`}
        >
          {t(locale, 'coach.ctaButton')}
          <ArrowUpRight aria-hidden className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  );
}

/**
 * The rating — orange. No stars are drawn for a coach nobody has reviewed:
 * "No reviews yet" is the honest card, and the same rule keeps a zero out
 * of Google's rich results (coaches/seo.ts).
 */
function RatingCard({
  coach,
  locale,
  style,
}: {
  coach: PublicCoach;
  locale: Locale;
  style: CSSProperties;
}) {
  const numbers = locale === 'ar' ? 'ar-EG' : 'en-GB';
  const rated = coach.averageRating !== null && coach.reviewCount > 0;

  return (
    <div className={`${styles.card} ${styles.orange}`} style={style}>
      {rated ? (
        <>
          <p className={`${styles.title} flex items-center gap-1.5 tabular-nums`}>
            <Star aria-hidden className="h-[18px] w-[18px] fill-current" />
            {coach.averageRating!.toFixed(1)}
          </p>
          <p className={`${styles.body} mt-1 opacity-80`}>
            {coach.reviewCount.toLocaleString(numbers)} {t(locale, 'coach.reviews')}
          </p>
        </>
      ) : (
        <p className={styles.title}>{t(locale, 'coach.noRating')}</p>
      )}
      <p className={`${styles.fine} mt-auto pt-4 opacity-70`}>{t(locale, 'coach.rating')}</p>
    </div>
  );
}

/** Followers — green. */
function FollowersCard({
  count,
  locale,
  style,
}: {
  count: number;
  locale: Locale;
  style: CSSProperties;
}) {
  const numbers = locale === 'ar' ? 'ar-EG' : 'en-GB';

  return (
    <div className={`${styles.card} ${styles.green}`} style={style}>
      <p className={`${styles.title} tabular-nums`}>{count.toLocaleString(numbers)}</p>
      <p className={`${styles.body} mt-1 opacity-75`}>{t(locale, 'coach.followers')}</p>
      <p className={`${styles.fine} mt-auto pt-4 opacity-60`}>{t(locale, 'coach.community')}</p>
    </div>
  );
}

/** No plan on sale yet — a quiet card, still where the Programmes pill lands. */
function NoPlansCard({ locale, style }: { locale: Locale; style: CSSProperties }) {
  return (
    <div id={CARD_IDS.plans} className={`${styles.card} ${styles.empty}`} style={style}>
      <p className={`${styles.body} text-stone-400`}>{t(locale, 'coach.noProgrammes')}</p>
      <p className={`${styles.fine} mt-auto text-stone-500`}>{t(locale, 'coach.programmes')}</p>
    </div>
  );
}

/** One plan on sale: title, what it is, how long, how much. */
function PlanCard({
  id,
  programme,
  tone,
  locale,
  style,
}: {
  id?: string;
  programme: CoachProgramme;
  tone: string;
  locale: Locale;
  style: CSSProperties;
}) {
  const description = programmeDescription(programme, locale);
  const level = isProgrammeLevel(programme.level)
    ? t(locale, `coach.level.${programme.level}`)
    : programme.level;
  const facts = [
    level,
    programme.durationDays > 0
      ? `${programme.durationDays} ${t(locale, 'coach.days')}`
      : null,
  ].filter(Boolean);

  return (
    <div id={id} className={`${styles.card} ${tone}`} style={style}>
      <div className="flex items-start justify-between gap-3">
        <h2 className={`${styles.title} line-clamp-2 break-words`}>
          {programmeTitle(programme, locale)}
        </h2>
        <CalendarDays aria-hidden className="mt-1 h-4 w-4 shrink-0 opacity-60" />
      </div>
      {description && (
        <p className={`${styles.body} mt-1.5 line-clamp-3 opacity-75`}>{description}</p>
      )}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-4">
        <p className={`${styles.fine} opacity-65`}>{facts.join(' · ')}</p>
        <p className={`${styles.item} font-semibold tabular-nums`}>
          {programme.priceEgp.toLocaleString('en-US')} {t(locale, 'product.currency')}
        </p>
      </div>
    </div>
  );
}

/** One course passed — the paper card. Same facts as the badge chip. */
function CertificateCard({
  id,
  certification,
  locale,
  style,
}: {
  id?: string;
  certification: CoachCertification;
  locale: Locale;
  style: CSSProperties;
}) {
  const issued = certificateDate(certification.issuedAt, locale);

  return (
    <div id={id} className={`${styles.card} ${styles.paper}`} style={style}>
      <Award aria-hidden className="h-5 w-5" />
      <p className={`${styles.fine} mt-auto pt-4 text-stone-500`}>{CERTIFIED_PREFIX}</p>
      <h2 className={`${styles.lead} font-semibold`}>
        {certificationTitle(certification, locale)}
      </h2>
      <p className={`${styles.fine} mt-1 text-stone-500`}>
        {t(locale, 'coach.certifiedNumber')} {certification.number}
        {issued && ` · ${issued}`}
      </p>
    </div>
  );
}

/** The coach's cover photo, when there is one. Below the fold: lazy. */
function CoverCard({ url, style }: { url: string; style: CSSProperties }) {
  return (
    <div className={`${styles.card} ${styles.cover}`} style={style}>
      {/* A plain <img> for the same reason as the avatar (ProfileHeader). */}
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
