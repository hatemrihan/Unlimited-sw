import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';

import dbConnect from '../../../lib/mongodb';
import ProductModel from '../../../models/product';

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Shared product fetch — called once, reused by metadata + render ─────────
// Next.js automatically deduplicates fetch() calls in server components,
// but raw Mongoose queries don't benefit from that. We use a module-level
// cache per-request via React.cache() to avoid double DB hits.
import { cache } from 'react';

const getProduct = cache(async (id: string) => {
  try {
    await dbConnect();

    // Valid MongoDB ObjectId → find by _id
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      const dbProduct = await ProductModel.findById(id).lean();
      if (dbProduct) return dbProduct as any;
    }

    // Not a valid ObjectId → product not found (no static fallback)
    return null;
  } catch (error) {
    console.error(`MongoDB fetch failed for product ${id}:`, error);
    return null;
  }
});

/** Fetches related products from MongoDB ONLY — sorted by admin order */
async function fetchRelatedProducts(excludeId: string) {
  try {
    await dbConnect();
    const dbProducts = await ProductModel.find({
      _id: { $ne: excludeId },
      isActive: true
    })
    .select('name price originalPrice discount mainImage images stock variants showPreorderBadge showOutOfStockBadge customOutOfStockMessage')
    .sort({ order: 1 })
    .limit(4)
    .lean();

    return (dbProducts || []) as any[];
  } catch (err) {
    console.error('Failed to fetch related products:', err);
    return [];
  }
}

// ─── Dynamic metadata ─────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id); // Uses React.cache — no double DB hit

  if (!product) return { title: 'Product Not Found | Unlimited SW' };

  const title = `${product.name} | Unlimited SW`;
  const description =
    product.description ||
    `Buy ${product.name} in Egypt. Premium calisthenics equipment from Unlimited SW.`;
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

  const [product, relatedProducts] = await Promise.all([
    getProduct(id), // Same React.cache instance — free if metadata already fetched it
    fetchRelatedProducts(id),
  ]);

  if (!product) notFound();

  // Serialize for client — strip Mongoose internals
  const serializedProduct = JSON.parse(JSON.stringify(product));
  const serializedRelated = JSON.parse(JSON.stringify(relatedProducts));

  return <ProductClient product={serializedProduct} relatedProducts={serializedRelated} />;
}
