import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import GuideArticle from '@/app/components/GuideArticle';
import { articleRepository } from '@/repositories/articleRepository';
import { getActiveProducts } from '@/product';
import { alternatesFor, absoluteUrl } from '@/lib/locale';
import { markdownToPlainText, renderMarkdown } from '@/lib/markdown';

interface Props {
  params: Promise<{ slug: string }>;
}

const getArticle = cache(async (slug: string) => articleRepository.getBySlug(slug, 'en'));

/**
 * Built on its first visit, then served from the CDN and refreshed at most
 * once a minute — the same rule as the guides list. The empty list below is
 * what makes Next cache these pages instead of rendering each visit.
 */
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(decodeURIComponent(slug));

  if (!article) return { title: 'Guide Not Found' };

  const title = article.seoTitle || article.title;
  const description =
    article.seoDescription || article.excerpt || markdownToPlainText(article.bodyMd);

  const enPath = `/guides/${article.slug}`;
  const arPath = `/ar/guides/${article.slugAr || article.slug}`;

  return {
    title,
    description,
    alternates: alternatesFor(enPath, arPath, 'en'),
    openGraph: {
      title,
      description,
      url: absoluteUrl(enPath),
      type: 'article',
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(decodeURIComponent(slug));

  if (!article) notFound();

  // Only the products the article actually references — the shortcodes name
  // them, so there is no reason to ship the whole catalogue to the page.
  const { productSlugs } = renderMarkdown(article.bodyMd);
  let products: any[] = [];

  if (productSlugs.length > 0) {
    try {
      const all = await getActiveProducts();
      products = JSON.parse(
        JSON.stringify(all.filter(p => productSlugs.includes(String(p.slug || p._id))))
      );
    } catch (e) {
      console.error('guide: product lookup failed', e);
    }
  }

  return <GuideArticle article={article} products={products} locale="en" />;
}
