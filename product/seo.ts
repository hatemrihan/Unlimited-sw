import type { Product } from '@/product/model';
import { CATEGORIES, type CategoryKey } from '@/product/categories';
import { absoluteUrl, type Locale } from '@/lib/locale';
import { t } from '@/i18n';

const OG_IMAGE = 'https://unlimited-sw.com/og-image.jpg';

/** Picks the Arabic field when it has content, else the English one. */
export function localized(product: Product, field: 'name' | 'description' | 'detailedDescription' | 'specifications', locale: Locale): string {
  if (locale === 'en') return (product as any)[field] || '';

  const arabicField = `${field}Ar` as keyof Product;
  // Falls back rather than showing a blank section: a product with no Arabic
  // description yet should still be a usable page.
  return ((product as any)[arabicField] || (product as any)[field] || '') as string;
}

/** The FAQ list for a locale, falling back to English. */
export function localizedFaqs(product: Product, locale: Locale) {
  const faqs = locale === 'ar' ? (product as any).faqsAr : product.faqs;
  const usable = (faqs || []).filter((f: any) => f?.question && f?.answer);
  if (usable.length > 0) return usable;
  return (product.faqs || []).filter((f: any) => f?.question && f?.answer);
}

/** The URL segment this product uses in a locale, with an English fallback. */
export function productSlug(product: Product, locale: Locale): string {
  const slug = locale === 'ar' ? product.slugAr || product.slug : product.slug;
  // Pre-backfill products have neither; the id still resolves and redirects.
  return slug || String(product._id);
}

/** The public path for a product in a locale. */
export function productPath(product: Product, locale: Locale): string {
  return locale === 'ar'
    ? `/ar/product/${productSlug(product, 'ar')}`
    : `/product/${productSlug(product, 'en')}`;
}

/**
 * A clean one-sentence meta description.
 *
 * Admin descriptions are bulleted, often part-Arabic and far over 160
 * characters; Google truncates those into nonsense. The product's own sentence
 * is what gets trimmed, never the price or the delivery terms — those are the
 * parts that earn the click.
 */
export function metaDescription(product: Product, locale: Locale): string {
  const override = locale === 'ar' ? product.seoDescriptionAr : product.seoDescription;
  if (override) return override;

  const MAX = 158;
  const name = localized(product, 'name', locale);
  const raw = localized(product, 'description', locale);
  const isArabic = locale === 'ar';

  const firstLine = (raw || '')
    .split('\n')
    .map(s => s.replace(/^[•\-\*\s]+/, '').trim())
    .find(s => s.length > 20) || '';

  const price = product.price ? `${product.price.toLocaleString('en-US')} ${t(locale, 'product.currency')}.` : '';

  const head = isArabic ? `${name} من Unlimited SW —` : `${name} by Unlimited SW —`;
  const tail = isArabic
    ? ` ${price} صناعة مصرية، شحن لكل المحافظات، الدفع عند الاستلام.`
    : ` ${price} Made in Egypt, delivery nationwide, cash on delivery.`;

  const room = MAX - head.length - tail.length - 2;
  let middle = '';
  if (firstLine && room > 20) {
    middle = firstLine.length <= room
      ? firstLine
      : firstLine.slice(0, room).replace(/[\s,;:–—-]+\S*$/, '');
  }

  return `${head}${middle ? ' ' + middle + '.' : ''}${tail}`.slice(0, MAX);
}

/** The <title> for a product page. The root template appends the brand. */
export function metaTitle(product: Product, locale: Locale): string {
  const override = locale === 'ar' ? product.seoTitleAr : product.seoTitle;
  if (override) return override;

  const name = localized(product, 'name', locale);
  return locale === 'ar'
    ? `${name} – أجهزة كاليسثينكس في مصر`
    : `${name} – Calisthenics Equipment Egypt`;
}

/**
 * Product structured data.
 *
 * Rendered on the server, not in ProductClient: Google reads the HTML the
 * server sends, and a script injected after hydration is not reliably seen.
 *
 * Availability distinguishes preorder from out-of-stock, because the badge on
 * the page already does and a mismatch between the two is a rich-results error.
 */
export function productJsonLd(product: Product, locale: Locale, aggregateRating?: { ratingValue: number; reviewCount: number }) {
  const url = absoluteUrl(productPath(product, locale));
  const images = [product.mainImage, ...(product.images || [])].filter(Boolean);

  const variantPrices = (product.variants || [])
    .map(v => v.price)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  const availability =
    (product.stock ?? 0) > 0
      ? 'https://schema.org/InStock'
      : product.showPreorderBadge
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/OutOfStock';

  const shared = {
    priceCurrency: 'EGP',
    availability,
    itemCondition: 'https://schema.org/NewCondition',
    url,
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'EG' },
    },
  };

  // Variants priced differently are one product sold in a range, not several
  // offers at one price — AggregateOffer is what says that.
  const offers =
    variantPrices.length > 1 && new Set(variantPrices).size > 1
      ? {
          '@type': 'AggregateOffer',
          lowPrice: Math.min(...variantPrices),
          highPrice: Math.max(...variantPrices),
          offerCount: variantPrices.length,
          ...shared,
        }
      : { '@type': 'Offer', price: product.price, ...shared };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: localized(product, 'name', locale),
    image: images.length > 0 ? images : [OG_IMAGE],
    description: metaDescription(product, locale),
    sku: String(product._id),
    brand: { '@type': 'Brand', name: 'Unlimited SW' },
    ...(product.category ? { category: CATEGORIES[product.category as CategoryKey].en } : {}),
    offers,
    ...(aggregateRating && aggregateRating.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: aggregateRating.ratingValue,
            reviewCount: aggregateRating.reviewCount,
          },
        }
      : {}),
  };
}

/** Home › Shop › Category › Product, as Google expects it. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** A FAQPage block from question/answer pairs. */
export function faqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
