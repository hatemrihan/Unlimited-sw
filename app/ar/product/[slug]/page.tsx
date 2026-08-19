import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import ProductClient from '@/app/product/[slug]/ProductClient';
import { getProductPageDataBySlug } from '@/product';
import { CATEGORIES, categorySlug, type CategoryKey } from '@/product/categories';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  localized,
  localizedFaqs,
  metaDescription,
  metaTitle,
  productJsonLd,
  productSlug,
} from '@/product/seo';
import { alternatesFor, absoluteUrl } from '@/lib/locale';
import { t } from '@/i18n';

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * The Arabic product page.
 *
 * Matches `slugAr` only. Resolving an Arabic URL against the English slug would
 * serve a page whose address and canonical disagree — the duplicate-content
 * problem hreflang exists to prevent.
 */
const getPageData = cache(async (slug: string) => getProductPageDataBySlug(slug, 'ar'));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Arabic slugs arrive percent-encoded on the wire.
  const data = await getPageData(decodeURIComponent(slug));

  if (!data) return { title: 'المنتج غير موجود' };
  const { product } = data;

  const title = metaTitle(product, 'ar');
  const description = metaDescription(product, 'ar');
  const image = product.mainImage || 'https://unlimited-sw.com/og-image.jpg';

  const enPath = `/product/${productSlug(product, 'en')}`;
  const arPath = `/ar/product/${productSlug(product, 'ar')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absoluteUrl(arPath),
      siteName: 'Unlimited SW',
      images: [{ url: image, width: 1080, height: 1350 }],
      type: 'website',
      locale: 'ar_EG',
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    alternates: alternatesFor(enPath, arPath, 'ar'),
  };
}

export default async function ArabicProductPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPageData(decodeURIComponent(slug));

  if (!data) notFound();

  const { product, related } = data;
  const category = product.category as CategoryKey | undefined;
  const faqs = localizedFaqs(product, 'ar');

  const breadcrumb = breadcrumbJsonLd([
    { name: t('ar', 'breadcrumb.home'), path: '/ar' },
    { name: t('ar', 'breadcrumb.shop'), path: '/ar/shop' },
    ...(category
      ? [{ name: CATEGORIES[category].ar, path: `/ar/shop/${categorySlug(category, 'ar')}` }]
      : []),
    { name: localized(product, 'name', 'ar'), path: `/ar/product/${productSlug(product, 'ar')}` },
  ]);

  const serializedProduct = JSON.parse(JSON.stringify(product));
  const serializedRelated = JSON.parse(JSON.stringify(related));

  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(productJsonLd(product, 'ar'))}
      </script>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(breadcrumb)}
      </script>
      {faqs.length > 0 && (
        <script type="application/ld+json" suppressHydrationWarning>
          {JSON.stringify(faqJsonLd(faqs))}
        </script>
      )}

      <ProductClient product={serializedProduct} relatedProducts={serializedRelated} locale="ar" />
    </>
  );
}
