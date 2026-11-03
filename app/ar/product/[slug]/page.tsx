import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { getPaymentMethods } from '@/payments/settings';

import ProductClient from '@/app/(en)/product/[slug]/ProductClient';
import { getCurrentSlug, getProductPageData, getProductPageDataBySlug } from '@/product';
import { getActiveProducts } from '@/product/actions';
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
// An id, not an address: a Mongo id (every product before 31 Oct 2026) or a
// Supabase uuid (a product created since). The uuid used to be read as an
// address, found nothing, and the new product's page said "not found".
const IS_OBJECT_ID = /^(?:[0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

/**
 * Also accepts the product id, like the English page.
 *
 * Until 22 Oct 2026 it matched `slugAr` only — but no live product had one, so
 * productPath() built every Arabic link (shop, home, sitemap) from the id, and
 * every Arabic product page answered 404. A product that gains an Arabic slug
 * is redirected to it, once, permanently.
 */
const getPageData = cache(async (slug: string) => {
  if (IS_OBJECT_ID.test(slug)) {
    const data = await getProductPageData(slug);
    return data ? { ...data, matchedById: true } : null;
  }

  const data = await getProductPageDataBySlug(slug, 'ar');
  return data ? { ...data, matchedById: false } : null;
});

/** Built at deploy and cached — app/(en)/product/[slug]/page.tsx explains the rules. */
export const revalidate = 30;

export async function generateStaticParams() {
  try {
    const products = await getActiveProducts();
    // The same address productPath() links to: the Arabic slug, else the id.
    return products
      .filter((product) => product.slugAr || !product.slug)
      .map((product) => ({ slug: productSlug(product, 'ar') }));
  } catch (error) {
    console.error('ar product: could not list products to pre-build', error);
    return [];
  }
}

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
  const address = decodeURIComponent(slug);
  const data = await getPageData(address);

  if (!data) {
    // An address the product used to have: one permanent redirect to the
    // address it has now (public.shop_product_slugs, 4 Nov 2026).
    const now = await getCurrentSlug(address, 'ar');
    if (now && now !== address) permanentRedirect(`/ar/product/${now}`);
    notFound();
  }

  const { product, related, matchedById } = data;

  if (matchedById && product.slugAr) {
    permanentRedirect(`/ar/product/${product.slugAr}`);
  }

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

  // The shop's real payment switches, for the line under the buttons.
  const methods = await getPaymentMethods().catch(() => null);
  const payments = methods ? { cod: methods.codEnabled, instapay: methods.instaPayEnabled } : undefined;

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

      <ProductClient product={serializedProduct} relatedProducts={serializedRelated} payments={payments} locale="ar" />
    </>
  );
}
