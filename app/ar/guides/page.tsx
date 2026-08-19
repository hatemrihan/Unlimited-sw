import type { Metadata } from 'next';

import GuidesIndex from '@/app/components/GuidesIndex';
import { articleRepository } from '@/repositories/articleRepository';
import { alternatesFor, absoluteUrl } from '@/lib/locale';

export const metadata: Metadata = {
  title: 'أدلة تدريب الكاليسثينكس',
  description:
    'أدلة في التركيب والأداء واختيار الأجهزة من د. محمد القاضي — كيف تركّب عقلة حائط، وكيف تختار قُطر البار، وكيف تجهّز جيماً منزلياً في مصر.',
  alternates: alternatesFor('/guides', '/ar/guides', 'ar'),
  openGraph: {
    title: 'أدلة تدريب الكاليسثينكس | Unlimited SW',
    url: absoluteUrl('/ar/guides'),
    type: 'website',
    locale: 'ar_EG',
  },
};

export default async function ArabicGuidesPage() {
  let articles: any[] = [];
  try {
    articles = await articleRepository.listPublished('ar');
  } catch (e) {
    console.error('ar/guides: list failed', e);
  }

  return <GuidesIndex articles={articles} locale="ar" />;
}
