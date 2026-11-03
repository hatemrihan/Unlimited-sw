/**
 * ============================================================
 * unlimited-sw · product · featured.ts
 * JOB: the one product the home page features, read live — its own name,
 *      price, stock and photos in both languages.
 * USED BY: app/sections/Featured.tsx (both home pages).
 * DEPENDS ON: shop_settings.featured_product_id through the
 *             shop_payment_options view (20261103220000), chosen on the
 *             dashboard (/shop → Settings).
 * RULES: · nothing is written by hand here: no name, price or photo
 *        · no featured product, a hidden one, or one out of stock = no
 *          section (null). A home page never sells what we cannot deliver.
 *        · a failed read = no section, never a broken home page
 * ============================================================
 *
 * WHY: until 3 Nov 2026 this section was typed into the code during the
 * MongoDB outage (Bahrain): one product, its price, its text and two local
 * photos, English only, with a "Buy Now" that kept selling the bundle
 * after it sold out. Now the head coach picks the product; everything shown
 * is the product itself.
 */

import { unstable_cache } from 'next/cache';

import type { Locale } from '@/lib/locale';
import { productQueries } from '@/product/queries';
import { productPath } from '@/product/seo';
import { PRODUCTS_TAG } from '@/product/tags';
import type { Product } from '@/product/model';
import { sellsFromSupabase, shopDb } from '@/shopdb/client';

/** What the section draws. Plain data, so the page hands it to the client. */
export interface FeaturedView {
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  /** Variant names (colours, sizes), as the product page lists them. */
  options: string[];
  /** One or two photos: two draw the before/after slider. */
  images: string[];
  href: string;
}

/** In stock = the product, or any of its variants, has a piece left. Pure. */
export function inStock(product: Pick<Product, 'stock' | 'variants'>): boolean {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length > 0) return variants.some((v) => Number(v.stock) > 0);
  return Number(product.stock) > 0;
}

/**
 * The product as the section shows it in one language, or null when it
 * must not be shown. Pure: tested in __tests__/featured-product.test.ts.
 */
export function featuredView(product: Product | null, locale: Locale): FeaturedView | null {
  if (!product || product.isActive === false || !inStock(product)) return null;
  const photos = [product.mainImage, ...(product.images ?? [])]
    .filter((src): src is string => typeof src === 'string' && src.trim() !== '');
  const images = Array.from(new Set(photos)).slice(0, 2);
  if (images.length === 0) return null;

  const name = (locale === 'ar' && product.nameAr?.trim()) || product.name;
  const description = ((locale === 'ar' && product.descriptionAr?.trim()) || product.description || '').trim();
  const original = Number(product.originalPrice);
  return {
    name,
    // The product's own sentence: the first line, never a wall of bullets.
    description: description.split('\n').map((l) => l.replace(/^[\s•\-*]+/, '').trim()).find(Boolean)?.slice(0, 180) ?? '',
    price: Number(product.price),
    originalPrice: Number.isFinite(original) && original > Number(product.price) ? original : null,
    options: (product.variants ?? []).filter((v) => Number(v.stock) > 0).map((v) => v.name).filter(Boolean).slice(0, 4),
    images,
    href: productPath(product, locale),
  };
}

/** The chosen product id, or null. Only the Supabase shop has the setting. */
async function readFeaturedId(): Promise<string | null> {
  if (!sellsFromSupabase()) return null;
  const { data, error } = await shopDb().from('shop_payment_options').select('featured_product_id').maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.featured_product_id as string | null | undefined) ?? null;
}

/**
 * Cached for a minute, and dropped with the products cache whenever a
 * product is edited, so a sale that empties the stock hides the section
 * at the next rebuild. The setting itself lives in the dashboard (another
 * app), so a change there shows within the minute.
 */
const readFeaturedCached = unstable_cache(
  async (): Promise<Product | null> => {
    const id = await readFeaturedId();
    if (!id) return null;
    return productQueries.findById(id);
  },
  ['products:featured'],
  { tags: [PRODUCTS_TAG], revalidate: 60 }
);

export async function getFeaturedProduct(): Promise<Product | null> {
  try {
    // Through JSON: the cache hands back plain data either way, and the
    // client section needs no database objects.
    return JSON.parse(JSON.stringify(await readFeaturedCached())) as Product | null;
  } catch (error) {
    console.error('[featured] could not read the featured product:', error instanceof Error ? error.message : error);
    return null;
  }
}
