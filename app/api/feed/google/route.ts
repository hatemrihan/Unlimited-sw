import { NextRequest } from 'next/server';

import { getActiveProducts } from '@/product';
import { CATEGORIES, type CategoryKey } from '@/product/categories';
import { localized, metaDescription, productPath } from '@/product/seo';
import { absoluteUrl, type Locale } from '@/lib/locale';
import {
  COUNTRIES,
  isCountryPublished,
  pathPrefix,
  priceFor,
  type Country,
  type CountryCode,
} from '@/lib/countries';
import type { Product } from '@/product/model';

/**
 * Google Merchant Center product feed (RSS 2.0 with the g: namespace).
 *
 *   /api/feed/google                        → Egypt, English
 *   /api/feed/google?lang=ar                → Egypt, Arabic
 *   /api/feed/google?country=SA&lang=ar     → Saudi Arabia, Arabic (Phase 4)
 *
 * A country feed is refused until that country is published — see
 * lib/countries.ts. Merchant Center would otherwise be advertising prices and
 * delivery we cannot honour.
 *
 * This is what puts the products in Google Shopping's free listings. Merchant
 * Center polls the URL on a schedule, so it must stay cheap and must never
 * return a partial feed — a feed missing items is read as those items being
 * withdrawn, and they drop out of Shopping.
 *
 * Cached for an hour: prices and stock do not move faster than that, and
 * Merchant Center does not fetch more often.
 */

export const revalidate = 3600;

/** XML text nodes: escape the five characters that would break the document. */
function xmlEscape(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Merchant Center's own taxonomy. Getting this right materially affects which
 * searches a product shows up in, so it is mapped per category rather than sent
 * as one generic value.
 */
const GOOGLE_CATEGORY: Record<CategoryKey, string> = {
  'pull-up-bars': 'Sporting Goods > Exercise & Fitness > Strength Training Equipment > Pull-Up Bars',
  'dip-parallel-bars': 'Sporting Goods > Exercise & Fitness > Strength Training Equipment > Strength Training Machines',
  'parallettes': 'Sporting Goods > Exercise & Fitness > Gymnastics > Gymnastics Bars & Balance Beams',
  'accessories': 'Sporting Goods > Exercise & Fitness > Gymnastics > Gymnastics Rings',
};

const DEFAULT_GOOGLE_CATEGORY = 'Sporting Goods > Exercise & Fitness';

/** The price in this country's currency, or null if none is set. */
const priceOf = (product: Product, country: Country) =>
  priceFor(product as { price: number; prices?: any }, country);

function availabilityOf(product: Product): string {
  if ((product.stock ?? 0) > 0) return 'in_stock';
  return product.showPreorderBadge ? 'preorder' : 'out_of_stock';
}

function itemXml(product: Product, locale: Locale, country: Country): string {
  // Egypt keeps the bare paths; other countries carry their prefix.
  const prefix = pathPrefix(country, locale);
  const link = absoluteUrl(`${prefix}${productPath(product, locale)}`);
  const images = [product.mainImage, ...(product.images || [])].filter(Boolean);
  const category = product.category as CategoryKey | undefined;

  const parts = [
    `<g:id>${xmlEscape(String(product._id))}</g:id>`,
    `<g:title>${xmlEscape(localized(product, 'name', locale))}</g:title>`,
    `<g:description>${xmlEscape(metaDescription(product, locale))}</g:description>`,
    `<g:link>${xmlEscape(link)}</g:link>`,
    images[0] ? `<g:image_link>${xmlEscape(images[0])}</g:image_link>` : '',
    // Up to 10 extra images is the Merchant Center limit.
    ...images.slice(1, 11).map(url => `<g:additional_image_link>${xmlEscape(url)}</g:additional_image_link>`),
    `<g:availability>${availabilityOf(product)}</g:availability>`,
    // Merchant Center wants the amount then the ISO currency: "1234.00 EGP".
    `<g:price>${priceOf(product, country)!.toFixed(country.decimals)} ${country.currency}</g:price>`,
    `<g:brand>Unlimited SW</g:brand>`,
    `<g:condition>new</g:condition>`,
    `<g:identifier_exists>no</g:identifier_exists>`,
    `<g:google_product_category>${xmlEscape(category ? GOOGLE_CATEGORY[category] : DEFAULT_GOOGLE_CATEGORY)}</g:google_product_category>`,
    category ? `<g:product_type>${xmlEscape(CATEGORIES[category].en)}</g:product_type>` : '',
    `<g:shipping><g:country>${country.code}</g:country></g:shipping>`,
  ].filter(Boolean);

  return `    <item>\n      ${parts.join('\n      ')}\n    </item>`;
}

export async function GET(request: NextRequest) {
  const locale: Locale = request.nextUrl.searchParams.get('lang') === 'ar' ? 'ar' : 'en';

  const requested = (request.nextUrl.searchParams.get('country') || 'EG').toUpperCase();
  const country = COUNTRIES[requested as CountryCode];

  if (!country) {
    return new Response('Unknown country', { status: 404 });
  }

  // The Phase 4 gate. A feed for a country we cannot ship to would put
  // unfulfillable offers into Google Shopping.
  if (!isCountryPublished(country.code)) {
    return new Response('Country not published', { status: 404 });
  }

  let products: Product[] = [];
  try {
    products = await getActiveProducts();
  } catch (error) {
    console.error('[feed] product read failed:', error);
    // A partial feed reads as "these products were withdrawn" and drops them
    // from Shopping. Fail loudly instead, so Merchant Center keeps the last
    // good feed and reports a fetch error we can see.
    return new Response('Feed temporarily unavailable', { status: 503 });
  }

  // A product with no price or no image is rejected by Merchant Center anyway;
  // sending it only fills the account's error report. Outside Egypt, a
  // product with no price in that currency is omitted rather than listed at
  // the Egyptian number.
  const sellable = products.filter(p => p.mainImage && (priceOf(p, country) ?? 0) > 0);

  const title = locale === 'ar' ? 'Unlimited SW — أجهزة كاليسثينكس' : 'Unlimited SW — Calisthenics Equipment';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(title)}</title>
    <link>${absoluteUrl(pathPrefix(country, locale) || '/')}</link>
    <description>${xmlEscape(
      locale === 'ar'
        ? 'أجهزة كاليسثينكس مصنوعة في مصر.'
        : 'Calisthenics equipment made in Egypt.'
    )}</description>
${sellable.map(product => itemXml(product, locale, country)).join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
