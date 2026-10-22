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
 * The Arabic twin of `/coaches/[username]`.
 *
 * The handle is the same in both languages — it is an identifier, not a
 * word — so unlike products there is no Arabic slug to look up. The only
 * difference between this file and its English mate is the locale it
 * passes down, and `alternatesFor` in coaches/seo.ts builds the hreflang
 * pair from the same two paths on both sides, so they cannot disagree.
 */
const getCoach = cache(async (username: string) =>
  getCoachByUsername(decodeURIComponent(username))
);

export const revalidate = 3600;

/** Empty on purpose: each coach page is built on its first visit, then cached for the hour above. */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const coach = await getCoach(username);

  if (!coach) return { title: 'المدرب غير موجود' };

  return coachMetadata(coach, 'ar');
}

export default async function ArabicCoachPage({ params }: Props) {
  const { username } = await params;
  const coach = await getCoach(username);

  if (!coach) notFound();

  return <CoachProfile coach={coach} locale="ar" />;
}
