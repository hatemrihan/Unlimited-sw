'use client';

import CoachPageError from '@/app/components/coach-profile/CoachPageError';

/** The Arabic twin of the English coach page's error.tsx. */
export default function ArabicCoachError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <CoachPageError error={error} reset={reset} locale="ar" />;
}
