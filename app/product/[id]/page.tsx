import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';

import { cache } from 'react';
import { getProductPageData } from '@/product';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Read once, used by both `generateMetadata` and the page body.
 *
 * `React.cache` deduplicates the two calls WITHIN a single request; the Data
 * Cache inside `getProductPageData` is what spares the database across
 * requests. Both are wanted — neither replaces the other.
 *
 * This file no longer touches Mongoose. It queried the model directly, which
 * made the page one of the files a Postgres migration would have had to find
 * and rewrite; `product/queries.ts` is meant to be the only such file.
 */
const getPageData = cache(async (id: string) => getProductPageData(id));

// ─── Dynamic metadata ─────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPageData(id); // React.cache — no double read

  if (!data) return { title: 'Product Not Found' };
  const { product } = data;

  // Admin descriptions are bulleted, often part-Arabic, and far over 160 chars.
  // Google truncates those into nonsense, so build one clean English sentence.
  const MAX = 158; // Google renders ~160; leave a character of headroom.

  const cleanDescription = (raw: string | undefined, name: string, price?: number) => {
    const firstLine = (raw || '')
      .split('\n')
      .map(s => s.replace(/^[•\-\*\s]+/, '').trim())
      .find(s => s.length > 20 && !/[؀-ۿ]/.test(s)) || '';

    const head = `${name} by Unlimited SW —`;
    const priceTxt = price ? ` ${price.toLocaleString()} EGP.` : '';
    const tail = `${priceTxt} Made in Egypt, delivery nationwide, cash on delivery.`;

    // Trim the product's own sentence rather than the whole string, so the price
    // and the delivery terms — the parts that make someone click — always survive.
    // A blunt slice() of the finished string cut them off on longer names.
    const room = MAX - head.length - tail.length - 2; // 2 = leading space + '.'
    let middle = '';
    if (firstLine && room > 20) {
      middle = firstLine.length <= room
        ? firstLine
        : firstLine.slice(0, room).replace(/[\s,;:–—-]+\S*$/, ''); // cut on a word boundary
    }

    return `${head}${middle ? ' ' + middle + '.' : ''}${tail}`.slice(0, MAX);
  };

  // The root layout's template appends " | Unlimited SW", so the brand is not
  // repeated here.
  const title = `${product.name} – Calisthenics Equipment Egypt`;
  const description = cleanDescription(product.description, product.name, product.price);
  const image = product.mainImage || 'https://unlimited-sw.com/og-image.jpg';
  const url = `https://unlimited-sw.com/product/${id}`;

  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'Unlimited SW', images: [{ url: image, width: 1080, height: 1350 }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    alternates: { canonical: url },
  };
}

// ─── Server Component ─────────────────────────────────────────────────────────
export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  // Same React.cache instance — free if generateMetadata already read it.
  const data = await getPageData(id);

  if (!data) notFound();

  // Serialize for client — strip Mongoose internals
  const serializedProduct = JSON.parse(JSON.stringify(data.product));
  const serializedRelated = JSON.parse(JSON.stringify(data.related));

  return <ProductClient product={serializedProduct} relatedProducts={serializedRelated} />;
}
