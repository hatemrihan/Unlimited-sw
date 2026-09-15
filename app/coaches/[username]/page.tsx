import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import CoachProfile from '@/app/components/CoachProfile';
import { getCoachByUsername } from '@/coaches/api';
import { coachMetadata } from '@/coaches/seo';

interface Props {
  params: Promise<{ username: string }>;
}

/**
 * `cache` so the <head> and the body are one query, not two.
 *
 * Next calls generateMetadata and the page separately, and without this
 * every coach page would ask the platform for the same coach twice.
 */
const getCoach = cache(async (username: string) =>
  getCoachByUsername(decodeURIComponent(username))
);

/**
 * A coach page is rebuilt at most once an hour.
 *
 * The facts on it change on a human timescale — a new programme, a
 * rewritten headline — and a stale follower count is not worth a database
 * round trip on every crawl. Not `force-static`: a newly verified coach
 * must appear without a deploy.
 */
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const coach = await getCoach(username);

  // No `noindex` needed here: the page below returns 404, and Next serves
  // the not-found route with the right status, which is what Google reads.
  if (!coach) return { title: 'Coach Not Found' };

  return coachMetadata(coach, 'en');
}

export default async function CoachPage({ params }: Props) {
  const { username } = await params;
  const coach = await getCoach(username);

  // Unverified, suspended, not a coach, or no such handle — all 404. See
  // the note in coaches/api.ts: a "pending approval" page would tell the
  // world that somebody applied.
  if (!coach) notFound();

  return <CoachProfile coach={coach} locale="en" />;
}
