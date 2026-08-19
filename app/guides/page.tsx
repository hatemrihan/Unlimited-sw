import type { Metadata } from 'next';

import GuidesIndex from '@/app/components/GuidesIndex';
import { articleRepository } from '@/repositories/articleRepository';
import { alternatesFor, absoluteUrl } from '@/lib/locale';

export const metadata: Metadata = {
  title: 'Calisthenics Training Guides',
  description:
    'Installation, technique and equipment guides from Dr. Mohamed Alkady — how to fit a pull-up bar, choose bar diameter, and set up a home calisthenics gym in Egypt.',
  alternates: alternatesFor('/guides', '/ar/guides', 'en'),
  openGraph: {
    title: 'Calisthenics Training Guides | Unlimited SW',
    url: absoluteUrl('/guides'),
    type: 'website',
  },
};

export default async function GuidesPage() {
  // A database outage renders an empty list, not a 500 — the page is still a
  // valid URL with a heading and internal links.
  let articles: any[] = [];
  try {
    articles = await articleRepository.listPublished('en');
  } catch (e) {
    console.error('guides: list failed', e);
  }

  return <GuidesIndex articles={articles} locale="en" />;
}
