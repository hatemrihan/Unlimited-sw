import type { Metadata } from 'next';

import CoachApplyPage from '@/app/components/coach-apply/CoachApplyPage';
import { APPLY_COPY } from '@/app/components/coach-apply/copy';
import { alternatesFor, absoluteUrl } from '@/lib/locale';

const EN_PATH = '/coaches/apply';
const AR_PATH = '/ar/coaches/apply';

export const metadata: Metadata = {
  title: APPLY_COPY.ar.metaTitle,
  description: APPLY_COPY.ar.metaDescription,
  alternates: alternatesFor(EN_PATH, AR_PATH, 'ar', 'everywhere'),
  openGraph: {
    title: APPLY_COPY.ar.metaTitle,
    description: APPLY_COPY.ar.metaDescription,
    url: absoluteUrl(AR_PATH),
  },
};

/**
 * The Arabic twin. Same component, `dir="rtl"`, and the same pair of paths
 * handed to `alternatesFor` so the hreflang cannot come out asymmetric.
 *
 * There is no language toggle inside the page beyond the corner link:
 * a URL per language is what Google indexes and what somebody pastes into
 * WhatsApp.
 */
export default async function ArabicApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string }>;
}) {
  const { confirm } = await searchParams;

  return <CoachApplyPage locale="ar" confirmToken={confirm} />;
}
