import type { Metadata } from 'next';

import WelcomePage from '@/app/components/coach-apply/WelcomePage';

export const metadata: Metadata = {
  title: 'أهلًا بك — Unlimited',
  robots: { index: false, follow: false },
};

export default function ArabicCoachWelcome() {
  return <WelcomePage locale="ar" />;
}
