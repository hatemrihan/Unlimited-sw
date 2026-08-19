import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import CategoryPage from '@/app/components/CategoryPage';
import { getProductsByCategory } from '@/product';
import { CATEGORIES, CATEGORY_KEYS, categorySlug, isCategoryKey } from '@/product/categories';
import { alternatesFor, absoluteUrl } from '@/lib/locale';

interface Props {
  params: Promise<{ category: string }>;
}

/** Four categories, known at build time — these prerender. */
export function generateStaticParams() {
  return CATEGORY_KEYS.map(category => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  if (!isCategoryKey(category)) return { title: 'Not Found' };

  const label = CATEGORIES[category].en;
  const title = `${label} in Egypt`;
  const description = `${label} made in Egypt by Unlimited SW. Heavy-gauge steel, prices in EGP, delivery nationwide with cash on delivery.`;

  const enPath = `/shop/${category}`;
  const arPath = `/ar/shop/${categorySlug(category, 'ar')}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Unlimited SW`,
      description,
      url: absoluteUrl(enPath),
      type: 'website',
    },
    alternates: alternatesFor(enPath, arPath, 'en'),
  };
}

export default async function ShopCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!isCategoryKey(category)) notFound();

  const products = JSON.parse(JSON.stringify(await getProductsByCategory(category)));

  return <CategoryPage category={category} products={products} locale="en" />;
}
