import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';

import ProductClient from './ProductClient';
import { getCurrentSlug, getProductPageData, getProductPageDataBySlug } from '@/product';
import { getActiveProducts } from '@/product/actions';
import { CATEGORIES, type CategoryKey } from '@/product/categories';
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
import { reviewRepository } from '@/repositories/reviewRepository';

interface Props {
  params: Promise<{ slug: string }>;
}

// An id, not an address: a Mongo id (every product before 31 Oct 2026) or a
// Supabase uuid (a product created since). The uuid used to be read as an
// address, found nothing, and the new product's page said "not found".
const IS_OBJECT_ID = /^(?:[0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

/**
 * Resolves the URL segment, which may be either form.
 *
 * Every product link Google has indexed since launch is `/product/<ObjectId>`,
 * and those are in customers' WhatsApp threads too. They keep working and
 * redirect once, permanently, to the slug.
 *
 * `React.cache` deduplicates the two calls within a request; the Data Cache
 * inside the actions is what spares the database across requests.
 */
const getPageData = cache(async (slug: string) => {
  if (IS_OBJECT_ID.test(slug)) {
    const data = await getProductPageData(slug);
    return data ? { ...data, matchedById: true } : null;
  }

  const data = await getProductPageDataBySlug(slug, 'en');
  return data ? { ...data, matchedById: false } : null;
});

/**
 * Every product page is built at deploy and served from the CDN.
 *
 * It is rebuilt when the product changes — admin edits, stock moves and new
 * orders all call revalidateProducts(), which clears this page with the data —
 * and at most every hour otherwise (30 seconds until 17 Nov 2026; see
 * DATA_CACHE_SECONDS in lib/cache-ttl.ts), the same bound the product data
 * cache had. Old /product/<ObjectId> links are not listed: they are built on
 * first visit and cached as the redirect they are.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const products = await getActiveProducts();
    return products.map((product) => ({ slug: productSlug(product, 'en') }));
  } catch (error) {
    // A database hiccup during the build must not fail the deploy; the pages
    // are then simply built on their first visit instead.
    console.error('product: could not list products to pre-build', error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(decodeURIComponent(slug));

  if (!data) return { title: 'Product Not Found' };
  const { product } = data;

  const title = metaTitle(product, 'en');
  const description = metaDescription(product, 'en');
  const image = product.mainImage || 'https://unlimited-sw.com/og-image.jpg';

  const enPath = `/product/${productSlug(product, 'en')}`;
  const arPath = `/ar/product/${productSlug(product, 'ar')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absoluteUrl(enPath),
      siteName: 'Unlimited SW',
      images: [{ url: image, width: 1080, height: 1350 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    alternates: alternatesFor(enPath, arPath, 'en'),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const address = decodeURIComponent(slug);
  const data = await getPageData(address);

  if (!data) {
    // An address the product used to have: one permanent redirect to the
    // address it has now (public.shop_product_slugs, 4 Nov 2026).
    const now = await getCurrentSlug(address, 'en');
    if (now && now !== address) permanentRedirect(`/product/${now}`);
    notFound();
  }

  const { product, related, matchedById } = data;

  // Reached by id: send the crawler and the customer to the canonical URL, once.
  if (matchedById && product.slug) {
    permanentRedirect(`/product/${product.slug}`);
  }

  const category = product.category as CategoryKey | undefined;
  const faqs = localizedFaqs(product, 'en');

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    ...(category ? [{ name: CATEGORIES[category].en, path: `/shop/${category}` }] : []),
    { name: localized(product, 'name', 'en'), path: `/product/${productSlug(product, 'en')}` },
  ]);

  // Stars in search results come from approved reviews only — see
  // reviewRepository.ratingSummary. A rating summary of zero reviews is omitted
  // from the schema entirely rather than sent as 0, which Google rejects.
  let rating = { ratingValue: 0, reviewCount: 0 };
  try {
    rating = await reviewRepository.ratingSummary(String(product._id));
  } catch (e) {
    console.error('product: rating summary failed', e);
  }


  const serializedProduct = JSON.parse(JSON.stringify(product));
  const serializedRelated = JSON.parse(JSON.stringify(related));

  return (
    <>
      {/* Server-rendered: a script injected after hydration is not reliably crawled. */}
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(productJsonLd(product, 'en', rating))}
      </script>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(breadcrumb)}
      </script>
      {faqs.length > 0 && (
        <script type="application/ld+json" suppressHydrationWarning>
          {JSON.stringify(faqJsonLd(faqs))}
        </script>
      )}

      <ProductClient product={serializedProduct} relatedProducts={serializedRelated} />
    </>
  );
}
