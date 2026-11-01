import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { alternatesFor } from '@/lib/locale';
import { coachPath } from '@/coaches/seo';

import PlanPage from '@/app/components/coach-profile/PlanPage';
import { getCoachByUsername } from '@/coaches/api';
import { programmeDescription, programmeTitle } from '@/coaches/schema';

interface Props {
  params: Promise<{ username: string; planId: string }>;
}

/** The Arabic twin of app/(en)/coaches/[username]/plans/[planId]/page.tsx. */
const getPlan = cache(async (username: string, planId: string) => {
  const coach = await getCoachByUsername(decodeURIComponent(username));
  const programme = coach?.programmes.find((plan) => plan.id === decodeURIComponent(planId));
  return coach && programme ? { coach, programme } : null;
});

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, planId } = await params;
  const found = await getPlan(username, planId);
  if (!found) return { title: 'الخطة غير موجودة' };
  return {
    title: `${programmeTitle(found.programme, 'ar')} · ${found.coach.displayName}`,
    description: programmeDescription(found.programme, 'ar').slice(0, 160) || undefined,
    // The same plan in both languages, offered across MENA (1 Nov 2026).
    alternates: alternatesFor(
      `${coachPath(found.coach.username, 'en')}/plans/${encodeURIComponent(planId)}`,
      `${coachPath(found.coach.username, 'ar')}/plans/${encodeURIComponent(planId)}`,
      'ar',
      'everywhere'
    ),
  };
}

export default async function ArabicCoachPlanPage({ params }: Props) {
  const { username, planId } = await params;
  const found = await getPlan(username, planId);
  if (!found) notFound();
  return <PlanPage coach={found.coach} programme={found.programme} locale="ar" />;
}
