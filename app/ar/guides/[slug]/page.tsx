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

const getArticle = cache(async (slug: string) => articleRepository.getBySlug(slug, 'ar'));

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

  if (!article) return { title: 'الدليل غير موجود' };

  const title = article.seoTitleAr || article.titleAr || article.title;
  const description =
    article.seoDescriptionAr || article.excerptAr || markdownToPlainText(article.bodyMdAr);

  const enPath = `/guides/${article.slug}`;
  const arPath = `/ar/guides/${article.slugAr || article.slug}`;

  return {
    title,
    description,
    alternates: alternatesFor(enPath, arPath, 'ar'),
    openGraph: {
      title,
      description,
      url: absoluteUrl(arPath),
      type: 'article',
      locale: 'ar_EG',
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
    },
  };
}

export default async function ArabicGuidePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(decodeURIComponent(slug));

  if (!article) notFound();

  const { productSlugs } = renderMarkdown(article.bodyMdAr || article.bodyMd);
  let products: any[] = [];

  if (productSlugs.length > 0) {
    try {
      const all = await getActiveProducts();
      products = JSON.parse(
        JSON.stringify(all.filter(p => productSlugs.includes(String(p.slug || p._id))))
      );
    } catch (e) {
      console.error('ar/guide: product lookup failed', e);
    }
  }

  return <GuideArticle article={article} products={products} locale="ar" />;
}
