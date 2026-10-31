import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import PlanPage from '@/app/components/coach-profile/PlanPage';
import { getCoachByUsername } from '@/coaches/api';
import { programmeDescription, programmeTitle } from '@/coaches/schema';

interface Props {
  params: Promise<{ username: string; planId: string }>;
}

/** The coach read already carries every plan on sale; one read per page. */
const getPlan = cache(async (username: string, planId: string) => {
  const coach = await getCoachByUsername(decodeURIComponent(username));
  const programme = coach?.programmes.find((plan) => plan.id === decodeURIComponent(planId));
  return coach && programme ? { coach, programme } : null;
});

/** Rebuilt at most once an hour, like the coach page. */
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, planId } = await params;
  const found = await getPlan(username, planId);
  if (!found) return { title: 'Plan Not Found' };
  return {
    title: `${programmeTitle(found.programme, 'en')} · ${found.coach.displayName}`,
    description: programmeDescription(found.programme, 'en').slice(0, 160) || undefined,
  };
}

export default async function CoachPlanPage({ params }: Props) {
  const { username, planId } = await params;
  const found = await getPlan(username, planId);
  // Not on sale, archived, or not his: the same 404 as an unknown coach.
  if (!found) notFound();
  return <PlanPage coach={found.coach} programme={found.programme} locale="en" />;
}
