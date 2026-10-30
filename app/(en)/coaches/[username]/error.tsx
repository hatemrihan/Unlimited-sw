'use client';

import CoachPageError from '@/app/components/coach-profile/CoachPageError';

/** The coach page could not be built — see CoachPageError. */
export default function CoachError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <CoachPageError error={error} reset={reset} locale="en" />;
}
