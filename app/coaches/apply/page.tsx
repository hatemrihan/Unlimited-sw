import type { Metadata } from 'next';

import CoachApplyPage from '@/app/components/coach-apply/CoachApplyPage';
import { APPLY_COPY } from '@/app/components/coach-apply/copy';
import { alternatesFor, absoluteUrl } from '@/lib/locale';

const EN_PATH = '/coaches/apply';
const AR_PATH = '/ar/coaches/apply';

export const metadata: Metadata = {
  title: APPLY_COPY.en.metaTitle,
  description: APPLY_COPY.en.metaDescription,
  alternates: alternatesFor(EN_PATH, AR_PATH, 'en'),
  openGraph: {
    title: APPLY_COPY.en.metaTitle,
    description: APPLY_COPY.en.metaDescription,
    url: absoluteUrl(EN_PATH),
  },
};

/**
 * `/coaches/apply` — and, with `?confirm=<token>`, where the link in the
 * confirmation email lands.
 *
 * One route for both because they are one conversation: the confirmation
 * may fail (his hour was taken while he read his email) and then the page
 * has to offer the slot picker again. Sending him to a separate
 * /confirm page would mean building that picker twice.
 */
export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string }>;
}) {
  const { confirm } = await searchParams;

  return <CoachApplyPage locale="en" confirmToken={confirm} />;
}
