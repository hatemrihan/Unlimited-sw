import type { Metadata } from 'next';

import WelcomePage from '@/app/components/coach-apply/WelcomePage';

/**
 * Where the approval email lands.
 *
 * `noindex`: this page is addressed to one person who was just approved.
 * It is not a landing page, it should never appear in a search result, and
 * a stranger reading it would learn nothing useful and see a welcome
 * meant for somebody else.
 */
export const metadata: Metadata = {
  title: 'Welcome — Unlimited',
  robots: { index: false, follow: false },
};

export default function CoachWelcome() {
  return <WelcomePage locale="en" />;
}
