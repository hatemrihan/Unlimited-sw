/**
 * ============================================================
 * unlimited-sw · coaches · schema.ts
 * JOB: the shape of a public coach profile, and the list of facts that
 *      must appear on BOTH the web page and the app screen.
 * USED BY: coaches/api.ts, the coach page, coaches/seo.ts.
 * DEPENDS ON: nothing — this file is types and one constant.
 * RULES: · every field here appears on both surfaces or on neither
 *        · nothing here is store-only; the platform's database is the
 *          source and this is only its shape
 * ============================================================
 *
 * PROFILE PARITY — Hatem's rule, 30 Aug 2026:
 * **"What he sees in web, he sees also in mobile."**
 *
 * The coach profile is ONE thing with two renderers. This file is where
 * that rule is written down, because a rule that lives only in a
 * conversation is a rule that drifts.
 *
 * The list below is the contract. A new profile fact lands in the
 * database first, then in BOTH renderers in the same piece of work. A
 * field on one surface and not the other is a bug by definition, not a
 * "for now".
 *
 * The mobile renderer is
 * `Unlimited_app/unlimited/lib/features/coaches/ui/coach_profile_screen.dart`.
 * If you change this list, that file changes in the same commit.
 */

/** Every fact a public coach profile shows, on both surfaces. */
export const PROFILE_FIELDS = [
  'cover image',
  'avatar',
  'display name',
  'headline (English and Arabic)',
  'bio',
  'average rating and review count',
  'follower count',
  'programme cards',
] as const;

export interface CoachProgramme {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  level: string;
  durationDays: number;
  priceEgp: number;
}

export interface PublicCoach {
  coachId: string;
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  headlineEn: string | null;
  headlineAr: string | null;
  bio: string | null;

  /** From `coach_ratings` — the one place that answers "how good is this
   *  coach". Never averaged anywhere else, on either surface. */
  averageRating: number | null;
  reviewCount: number;

  followerCount: number;
  isAcceptingAthletes: boolean;
  programmes: CoachProgramme[];
}

/**
 * The headline in the reader's language, falling back to the other rather
 * than to nothing.
 *
 * A coach who filled in only one language still has something to say, and
 * an empty headline on a shop window is worse than one in the wrong
 * language.
 */
export function headlineFor(coach: PublicCoach, locale: 'en' | 'ar'): string {
  const preferred = locale === 'ar' ? coach.headlineAr : coach.headlineEn;
  const other = locale === 'ar' ? coach.headlineEn : coach.headlineAr;
  return (preferred?.trim() || other?.trim()) ?? '';
}

export function programmeTitle(
  programme: CoachProgramme,
  locale: 'en' | 'ar'
): string {
  const preferred = locale === 'ar' ? programme.titleAr : programme.titleEn;
  return preferred?.trim() || programme.titleEn;
}
