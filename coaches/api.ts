/**
 * ============================================================
 * unlimited-sw · coaches · api.ts
 * JOB: read verified coaches out of the coaching platform, and nothing else.
 * USED BY: app/coaches/[username]/page.tsx, its Arabic twin, and sitemap.ts.
 * DEPENDS ON: coaches/supabase.ts, coaches/schema.ts.
 * RULES: · reads only — this file contains no insert, update or delete
 *        · an unverified or suspended coach is NOT FOUND, never a partial page
 *        · a FAILED read is an error, never "not found" (see below)
 *        · one round trip per page
 * ============================================================
 *
 * WHY A FAILED READ THROWS (30 Oct 2026)
 *
 * It used to come back as null, so a database hiccup made a real coach a
 * 404 — and the page is cached for an hour, so that 404 stayed on the CDN
 * for an hour and Google was told the coach was gone. Now it throws. When
 * Next rebuilds a cached page and the rebuild throws, it keeps serving the
 * last good copy; on a first-ever visit the visitor gets the route's
 * error.tsx with a "try again" button. Nothing about the failure is cached.
 *
 * WHY THERE IS NO `status = 'active'` FILTER IN THIS FILE
 *
 * You would expect one, and its absence is deliberate. The platform's own
 * row security already hides unverified coaches from this key: the
 * `verified coaches are readable` policy (migration 20260830000300) shows
 * a coach card only when it is active, or to the coach himself, or to an
 * admin — and this store is none of those, it is an anonymous reader.
 *
 * Writing the filter here as well would look like belt and braces and is
 * actually a trap: it teaches the next person that the store is what
 * enforces the rule. It is not. If this filter and the policy ever
 * disagreed, the policy would win — so there is one rule, in one place,
 * and this file simply asks for coaches and receives the ones it may see.
 */

import { certificationsFor } from './certifications';
import { coachDatabase } from './supabase';
import { isMadeUpHandle, type CoachProgramme, type PublicCoach } from './schema';

/**
 * Everything a coach page shows, in one row.
 *
 * `public_coaches` is a view built for exactly this (migration
 * 20260830000400): verified coaches only, with the rating and follower
 * count already folded in. The mobile app reads the same view, which is
 * how profile parity is kept by construction rather than by two teams
 * remembering the same list.
 */
const COACH_COLUMNS = `
  coach_id, profile_id, username, display_name, avatar_url, bio,
  cover_image_url, headline_en, headline_ar, is_accepting_athletes,
  review_count, average_rating, follower_count, has_tick
`;

/**
 * How long a coach page waits for the platform before giving up.
 *
 * Without a limit a slow database holds the visitor on a blank page for as
 * long as the platform takes. Eight seconds is far past a normal read
 * (tens of milliseconds) and short of the point where people leave.
 */
const READ_TIMEOUT_MS = 8000;

/** A read failed: the platform answered with an error, or not in time. */
export class CoachReadError extends Error {
  constructor(what: string, cause: unknown) {
    super(`Could not read ${what} from the coaching platform.`, { cause });
    this.name = 'CoachReadError';
  }
}

/**
 * One coach by their @handle, or null when there is nobody to show.
 *
 * Null covers three cases the page must treat identically: no such
 * handle, the handle belongs to somebody who is not a coach, and the
 * coach exists but is not verified. All three are 404 — a "this coach is
 * pending approval" page would tell the world that they applied.
 */
export async function getCoachByUsername(
  username: string
): Promise<PublicCoach | null> {
  const supabase = coachDatabase();

  const { data: coach, error: coachError } = await supabase
    .from('public_coaches')
    .select(COACH_COLUMNS)
    .eq('username', username)
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
    .maybeSingle();

  if (coachError) throw new CoachReadError('the coach', coachError);
  if (!coach) return null;

  // Two round trips rather than an embedded join: `public_coaches` is a
  // view, and PostgREST cannot always infer a relationship from a view to
  // a table. A second small query by coach_id is boring and always works.
  // `plans` since 16 Oct 2026 (Supabase migration 20261017120000): a plan
  // on sale IS the programme. The old `programs` name is a temporary view
  // that the database drops once this code is live.
  const [{ data: programmes, error: plansError }, certifications] =
    await Promise.all([
      supabase
        .from('plans')
        .select(
          'id, slug, title_en, title_ar, description_en, description_ar, level, duration_days, price_egp, cover_image_url'
        )
        .eq('coach_id', coach.coach_id)
        // The one rule the policy does NOT hold (30 Oct 2026): it never looks
        // at `archived_at`, so a plan taken off the shelf but still marked on
        // sale came through — the app and Home leave it out, and so does this.
        .is('archived_at', null)
        .order('position', { ascending: true })
        .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS)),
      // The Certified badges (courses, 19 Oct 2026): the same view the app's
      // chip reads, keyed by the PROFILE id. Side by side with the plans so
      // the page still costs one wait, not two.
      certificationsFor(coach.profile_id),
    ]);

  // "No programmes published yet" is a claim about the coach. Printing it
  // because the read failed would be a lie, so a failed read is an error.
  // (Badges are different: certificationsFor answers [] on failure on
  // purpose — a badge that cannot be confirmed is not shown.)
  if (plansError) throw new CoachReadError('the coach’s plans', plansError);

  return {
    coachId: coach.coach_id,
    profileId: coach.profile_id,
    username: coach.username,
    // A made-up `user_…` handle is never a coach's name on the page.
    displayName: coach.display_name?.trim() || (isMadeUpHandle(coach.username) ? 'Unlimited coach' : coach.username),
    avatarUrl: coach.avatar_url,
    coverUrl: coach.cover_image_url,
    headlineEn: coach.headline_en,
    headlineAr: coach.headline_ar,
    bio: coach.bio,
    averageRating:
      coach.average_rating === null ? null : Number(coach.average_rating),
    reviewCount: Number(coach.review_count ?? 0),
    followerCount: Number(coach.follower_count ?? 0),
    isAcceptingAthletes: coach.is_accepting_athletes,
    hasTick: coach.has_tick === true,
    // No `is_on_sale` filter here on purpose: the anonymous reader's
    // policy already returns plans on sale of verified coaches and nothing
    // else. Re-filtering would imply this file is what enforces it, and it
    // is not.
    programmes: (programmes ?? []).map(
      (programme): CoachProgramme => ({
        id: programme.id,
        slug: programme.slug,
        titleEn: programme.title_en,
        titleAr: programme.title_ar,
        descriptionEn: programme.description_en ?? '',
        descriptionAr: programme.description_ar ?? '',
        level: programme.level,
        durationDays: programme.duration_days,
        priceEgp: Number(programme.price_egp),
        coverUrl: programme.cover_image_url ?? null,
      })
    ),
    certifications,
  };
}

/**
 * Every verified coach's handle, for the sitemap.
 *
 * Only handles. A sitemap needs URLs, and pulling whole profiles to build
 * a list of addresses would be a page of work for one column.
 */
export async function listCoachUsernames(): Promise<string[]> {
  const supabase = coachDatabase();

  const { data } = await supabase.from('public_coaches').select('username');

  return (data ?? [])
    .map((row) => row.username)
    .filter((username): username is string => Boolean(username));
}

/**
 * An OLD page address → the coach's current one (30 Oct 2026, Supabase
 * migration 20261030150200 `coach_address_v1`). A coach who changes his
 * address keeps every link he ever shared — the made-up /coaches/user_…
 * one included. Null when the address never belonged to a coach this
 * store shows. A failed read throws, like the page read: never a cached 404.
 */
export async function currentAddressFor(username: string): Promise<string | null> {
  const supabase = coachDatabase();

  const { data, error } = await supabase
    .rpc('coach_address_v1', { p_username: username })
    .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));

  if (error) throw new CoachReadError('the coach’s address', error);
  return typeof data === 'string' && data && data !== username ? data : null;
}
