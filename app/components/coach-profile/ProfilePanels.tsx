import Link from 'next/link';
import { Star } from 'lucide-react';

import { t } from '@/i18n';
import { planPath } from '@/coaches/seo';
import type { Locale } from '@/lib/locale';
import { certificateDate, certificationTitle, CERTIFIED_PREFIX } from '@/coaches/certifications';
import {
  isProgrammeLevel,
  programmeDescription,
  programmeTitle,
  type CoachProgramme,
  type PublicCoach,
} from '@/coaches/schema';

import ZoomImage from './ZoomImage';
import styles from './CoachProfile.module.css';

const numbersFor = (locale: Locale) => (locale === 'ar' ? 'ar-EG' : 'en-GB');

/**
 * Everything the coach entered, as plain text, one section under the
 * other (Hatem, 30 Oct 2026: "show everything normal in a text, no
 * circles, no border boxes"). No tabs, no cards, no JavaScript.
 */
export default function ProfileSections({ coach, locale }: { coach: PublicCoach; locale: Locale }) {
  return (
    <div className="mt-12 space-y-12 px-2 sm:px-6">
      <Plans coach={coach} locale={locale} />
      <Ratings coach={coach} locale={locale} />
      {coach.certifications.length > 0 && <Certificates coach={coach} locale={locale} />}
    </div>
  );
}

function Label({ children }: { children: string }) {
  return (
    <h2 className={`${styles.fine} mb-3 font-medium uppercase tracking-[0.08em] text-stone-500`}>
      {children}
    </h2>
  );
}

function Plans({ coach, locale }: { coach: PublicCoach; locale: Locale }) {
  return (
    <section id="plans" className="scroll-mt-28">
      <Label>{t(locale, 'coach.plans')}</Label>
      {coach.programmes.length === 0 ? (
        <p className={`${styles.body} text-stone-500`}>{t(locale, 'coach.noProgrammes')}</p>
      ) : (
        <div className="space-y-12">
          {coach.programmes.map((programme) => (
            <Plan key={programme.id} coach={coach} programme={programme} locale={locale} />
          ))}
          <p className={`${styles.fine} text-stone-500`}>{t(locale, 'coach.joinInApp')}</p>
        </div>
      )}
    </section>
  );
}

/**
 * One plan: name, length · level · price, his description, his cover.
 * The whole plan is one link to its own page (planPath).
 */
function Plan({
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
      ? `${programme.durationDays.toLocaleString(numbersFor(locale))} ${t(locale, 'coach.days')}`
      : null,
    level,
    `${programme.priceEgp.toLocaleString('en-US')} ${t(locale, 'product.currency')}`,
  ].filter(Boolean);

  // Words on the left, the picture on the right (30 Oct 2026); on a phone
  // the picture goes under the words, full width. The words open the plan's
  // page; the picture only grows, on this page.
  return (
    <article className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,44%)] sm:gap-8">
      <Link
        href={planPath(coach.username, programme.id, locale)}
        className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <h3 className={`${styles.title} font-medium text-white underline-offset-4 group-hover:underline`}>
          {programmeTitle(programme, locale)}{' '}
          <span aria-hidden className="text-stone-500 rtl:inline-block rtl:-scale-x-100">→</span>
        </h3>
        <p className={`${styles.item} mt-1 text-stone-500`}>{facts.join(' · ')}</p>
        {description && (
          <p className={`${styles.body} mt-3 line-clamp-4 whitespace-pre-line text-stone-400`}>
            {description}
          </p>
        )}
      </Link>
      {programme.coverUrl && (
        <ZoomImage
          src={programme.coverUrl}
          alt={programmeTitle(programme, locale)}
          closeLabel={t(locale, 'coach.close')}
          wrapperClassName="w-full"
          className="aspect-[4/3] w-full rounded-2xl bg-stone-800 object-cover"
        />
      )}
    </article>
  );
}

/**
 * Ratings — the average and how many athletes gave one, from
 * `coach_ratings` (the one place that answers "how good is this coach").
 * The written reviews are members-only in the database, so only the
 * numbers are here. No ratings: say how a coach gets one, never a 0.
 */
function Ratings({ coach, locale }: { coach: PublicCoach; locale: Locale }) {
  const rated = coach.averageRating !== null && coach.reviewCount > 0;
  const numbers = numbersFor(locale);

  return (
    <section id="ratings" className="scroll-mt-28">
      <Label>{t(locale, 'coach.ratings')}</Label>
      {rated ? (
        <div className="flex items-center gap-3">
          <p className={`${styles.title} font-medium text-white tabular-nums`}>
            {coach.averageRating!.toFixed(1)}
          </p>
          <div>
            <Stars value={coach.averageRating!} label={`${coach.averageRating!.toFixed(1)} ${t(locale, 'coach.outOf5')}`} />
            <p className={`${styles.fine} mt-1 text-stone-500`}>
              {t(locale, 'coach.basedOn')} {coach.reviewCount.toLocaleString(numbers)}{' '}
              {t(locale, coach.reviewCount === 1 ? 'coach.ratingOne' : 'coach.ratingMany')}
            </p>
          </div>
        </div>
      ) : (
        <p className={`${styles.body} text-stone-500`}>
          {t(locale, 'coach.noRating')}. {t(locale, 'coach.ratingsEmpty')}
        </p>
      )}
    </section>
  );
}

/** Five stars, filled to the nearest half. */
function Stars({ value, label }: { value: number; label: string }) {
  const half = Math.round(value * 2) / 2;
  return (
    <span role="img" aria-label={label} className="flex gap-0.5 text-stone-100">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative h-4 w-4">
          <Star aria-hidden className="absolute inset-0 h-4 w-4 text-stone-600" />
          {half >= n - 0.5 && (
            <span className={`absolute inset-0 overflow-hidden ${half >= n ? 'w-full' : 'w-1/2'}`}>
              <Star aria-hidden className="h-4 w-4 fill-current" />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function Certificates({ coach, locale }: { coach: PublicCoach; locale: Locale }) {
  return (
    <section id="certificates" className="scroll-mt-28">
      <Label>{t(locale, 'coach.certificates')}</Label>
      <ul className="space-y-3">
        {coach.certifications.map((certification) => {
          const issued = certificateDate(certification.issuedAt, locale);
          return (
            <li key={certification.courseId}>
              <p className={`${styles.item} text-stone-100`}>
                {CERTIFIED_PREFIX} · {certificationTitle(certification, locale)}
              </p>
              <p className={`${styles.fine} text-stone-500`}>
                {t(locale, 'coach.certifiedNumber')} {certification.number}
                {issued && ` · ${issued}`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
