import type { Metadata } from 'next';
import { headers } from 'next/headers';

import PostTeaser from '@/app/components/PostTeaser';
import { getPostTeaser } from '@/coaches/posts';
import { t } from '@/i18n';

interface Props {
  params: Promise<{ id: string }>;
}

/** The Arabic twin of /p/[id]. Same door, same rules, other words. */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const teaser = await getPostTeaser(id);
  const title = teaser
    ? t('ar', 'post.title').replace('{name}', teaser.authorName)
    : t('ar', 'post.unavailableTitle');
  return {
    title,
    description: t('ar', 'post.body'),
    robots: { index: false, follow: false },
    openGraph: { title, description: t('ar', 'post.body'), images: ['/og-image.jpg'] },
  };
}

export default async function ArabicPostPage({ params }: Props) {
  const { id } = await params;
  const android = /android/i.test((await headers()).get('user-agent') ?? '');
  const teaser = await getPostTeaser(id);
  return <PostTeaser id={id} teaser={teaser} locale="ar" android={android} />;
}
