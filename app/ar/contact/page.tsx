import type { Metadata } from 'next';

import ConactClient from '@/app/(en)/contact/ConactClient';
import { alternatesFor, absoluteUrl } from '@/lib/locale';

export const metadata: Metadata = {
  title: 'تواصل معنا',
  description:
    'تواصل مع Unlimited SW بخصوص أجهزة الكاليسثينكس، المقاسات المناسبة لمساحتك، أو الطلبات الخاصة. الرد خلال يوم عمل.',
  alternates: alternatesFor('/contact', '/ar/contact', 'ar'),
  openGraph: {
    title: 'تواصل معنا | Unlimited SW',
    url: absoluteUrl('/ar/contact'),
    type: 'website',
    locale: 'ar_EG',
  },
};

export default function ArabicContactPage() {
  return <ConactClient />;
}
