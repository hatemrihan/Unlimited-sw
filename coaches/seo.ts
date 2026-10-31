/**
 * ============================================================
 * unlimited-sw · coaches · seo.ts
 * JOB: the addresses of a coach page, its <head>, and the structured data
 *      that lets Google show a coach as a person rather than a paragraph.
 * USED BY: app/coaches/[username]/page.tsx and its Arabic twin, sitemap.ts.
 * DEPENDS ON: coaches/schema.ts, lib/locale, product/seo (breadcrumbs).
 * RULES: · the two languages are built from the same pair of paths, so an
 *          hreflang pair can never come out asymmetric
 *        · nothing here invents a fact — a missing rating is absent from
 *          the markup, never a zero
 * ============================================================
 *
 * WHY THE COACH PAGES LIVE ON THE STORE AND NOT ON THE APP
 *
 * A coach profile's job is to be found: searched for by name, shared in a
 * WhatsApp thread, linked from an Instagram bio. None of that is possible
 * inside a phone app, and a brand-new domain would start from zero.
 * unlimited-sw.com already has the crawl history, so the profile is served
 * from here and reads the platform's database over the wire.
 */

import type { Metadata } from 'next';

import { absoluteUrl, alternatesFor, type Locale } from '@/lib/locale';
import { t } from '@/i18n';
import { headlineFor, programmeTitle, type PublicCoach } from './schema';

/** `/coaches/hatem` or `/ar/coaches/hatem`. */
export function coachPath(username: string, locale: Locale): string {
  const handle = encodeURIComponent(username);
  return locale === 'ar' ? `/ar/coaches/${handle}` : `/coaches/${handle}`;
}

/** One plan of a coach's, by its id (a slug is only unique per coach). */
export function planPath(username: string, planId: string, locale: Locale): string {
  return `${coachPath(username, locale)}/plans/${encodeURIComponent(planId)}`;
}

/**
 * The description Google shows under the link.
 *
 * The headline first, because the coach wrote it to be read. The bio only
 * when there is no headline, trimmed at a word so a search result never
 * ends mid-syllable.
 */
export function coachDescription(coach: PublicCoach, locale: Locale): string {
  const headline = headlineFor(coach, locale);
  const source = headline || coach.bio?.trim() || '';

  if (source.length <= 155) return source;
  const cut = source.slice(0, 155);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

export function coachMetadata(coach: PublicCoach, locale: Locale): Metadata {
  const title = `${coach.displayName} · ${t(locale, 'coach.breadcrumb')}`;
  const description = coachDescription(coach, locale);
  const enPath = coachPath(coach.username, 'en');
  const arPath = coachPath(coach.username, 'ar');

  // The cover is the wide image a shared link deserves; the avatar is
  // square and would be cropped to a face and a chin. Falling back to the
  // avatar is still better than falling back to the store's logo, which
  // would make every coach's link look like the same link.
  const image = coach.coverUrl || coach.avatarUrl;

  return {
    title,
    description,
    alternates: alternatesFor(enPath, arPath, locale),
    openGraph: {
      title,
      description,
      type: 'profile',
      url: absoluteUrl(coachPath(coach.username, locale)),
      images: image ? [{ url: image }] : undefined,
    },
  };
}

/**
 * The coach as a Person, with their programmes as things they offer.
 *
 * `aggregateRating` is omitted entirely when nobody has reviewed them.
 * Google treats a rating of zero as a rating, and a coach's first
 * impression in a search result should not be one star.
 */
export function coachJsonLd(coach: PublicCoach, locale: Locale) {
  const url = absoluteUrl(coachPath(coach.username, locale));

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      '@id': url,
      name: coach.displayName,
      alternateName: coach.username,
      description: headlineFor(coach, locale) || coach.bio || undefined,
      image: coach.avatarUrl || undefined,
      url,
      jobTitle: locale === 'ar' ? 'مدرب' : 'Coach',
      worksFor: { '@type': 'Organization', name: 'Unlimited SW' },

      ...(coach.reviewCount > 0 && coach.averageRating !== null
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: coach.averageRating,
              reviewCount: coach.reviewCount,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),

      makesOffer: coach.programmes.map((programme) => ({
        '@type': 'Offer',
        name: programmeTitle(programme, locale),
        price: programme.priceEgp,
        priceCurrency: 'EGP',
        category: locale === 'ar' ? 'برنامج تدريبي' : 'Training programme',
      })),
    },
  };
}
