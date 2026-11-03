import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import CategoryPage from '@/app/components/CategoryPage';
import { getActiveProducts, getProductsByCategory } from '@/product';
import {
  CATEGORIES,
  CATEGORY_KEYS,
  categoryFromArabicSlug,
  categorySlug,
  stockedCategories,
} from '@/product/categories';
import { alternatesFor, absoluteUrl } from '@/lib/locale';

interface Props {
  params: Promise<{ category: string }>;
}

/** The Arabic URL segments, e.g. 'عقلة-حائط'. */
export function generateStaticParams() {
  return CATEGORY_KEYS.map(key => ({ category: CATEGORIES[key].slugAr }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: segment } = await params;
  // Arabic segments arrive percent-encoded.
  const key = categoryFromArabicSlug(decodeURIComponent(segment));
  if (!key) return { title: 'غير موجود' };

  const label = CATEGORIES[key].ar;
  const title = `${label} في مصر`;
  const description = `${label} صناعة مصرية من Unlimited SW. صاج سميك، أسعار بالجنيه المصري، شحن لكل المحافظات مع الدفع عند الاستلام.`;

  const enPath = `/shop/${key}`;
  const arPath = `/ar/shop/${categorySlug(key, 'ar')}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Unlimited SW`,
      description,
      url: absoluteUrl(arPath),
      type: 'website',
      locale: 'ar_EG',
    },
    alternates: alternatesFor(enPath, arPath, 'ar'),
  };
}

export default async function ArabicShopCategoryPage({ params }: Props) {
  const { category: segment } = await params;
  const key = categoryFromArabicSlug(decodeURIComponent(segment));
  if (!key) notFound();

  const [found, all] = await Promise.all([
    getProductsByCategory(key),
    getActiveProducts().catch(() => []),
  ]);
  // Nothing on sale here yet: "not found", not an empty page (4 Nov 2026).
  if (found.length === 0) notFound();

  const products = JSON.parse(JSON.stringify(found));
  const stocked = stockedCategories(all as { category?: string | null }[]);

  return <CategoryPage category={key} products={products} stocked={stocked} locale="ar" />;
}
