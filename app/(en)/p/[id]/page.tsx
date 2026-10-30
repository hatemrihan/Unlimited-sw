import type { Metadata } from 'next';
import { headers } from 'next/headers';

import PostTeaser from '@/app/components/PostTeaser';
import { getPostTeaser } from '@/coaches/posts';
import { t } from '@/i18n';
import type { Locale } from '@/lib/locale';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * /p/<id> — the page a shared post link opens when the app does not catch
 * it first (docs/SHARE-AND-FOLLOW-PLAN.md, Part D).
 *
 * ONE ADDRESS FOR BOTH LANGUAGES. A member shares the same link whatever
 * language they read in, so the page answers in the visitor's browser
 * language. /ar/p/<id> is the explicit Arabic twin.
 *
 * NEVER CACHED, NEVER INDEXED: a post deleted a minute ago must read "not
 * available" now, and a teaser page is for the person holding the link,
 * not for search.
 */
export const dynamic = 'force-dynamic';

async function visitor(): Promise<{ locale: Locale; android: boolean }> {
  const h = await headers();
  const language = (h.get('accept-language') ?? '').toLowerCase();
  return {
    locale: language.startsWith('ar') ? 'ar' : 'en',
    android: /android/i.test(h.get('user-agent') ?? ''),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { locale } = await visitor();
  const teaser = await getPostTeaser(id);
  const title = teaser
    ? t(locale, 'post.title').replace('{name}', teaser.authorName)
    : t(locale, 'post.unavailableTitle');
  return {
    title,
    description: t(locale, 'post.body'),
    robots: { index: false, follow: false },
    // The WhatsApp card: the brand image, never the post's own photo.
    openGraph: { title, description: t(locale, 'post.body'), images: ['/og-image.jpg'] },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const { locale, android } = await visitor();
  const teaser = await getPostTeaser(id);
  return <PostTeaser id={id} teaser={teaser} locale={locale} android={android} />;
}
