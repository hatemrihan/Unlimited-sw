import type { Metadata } from 'next';

import GuidesIndex from '@/app/components/GuidesIndex';
import { articleRepository } from '@/repositories/articleRepository';
import { alternatesFor, absoluteUrl } from '@/lib/locale';

/**
 * Built once and served from the CDN, refreshed at most once a minute.
 *
 * Articles are read straight from MongoDB and the admin guide routes do not
 * clear any cache, so without a refresh time a newly published guide would
 * never appear until the next deploy. A minute is invisible for something
 * published a few times a month.
 */
export const revalidate = 60;

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
