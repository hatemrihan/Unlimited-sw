import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { STATIC_PRODUCTS, getStaticProductById, nameToSlug } from '../../../data/products';

import dbConnect from '../../../lib/mongodb';
import ProductModel from '../../../models/product';

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Direct Server-side data ────────────────────────────────────────────────
async function fetchProduct(id: string) {
  try {
    if (process.env.MONGO_BYPASS !== 'true') {
      await dbConnect();
      // First try to find by MongoDB ID Document
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        const dbProduct = await ProductModel.findById(id).lean();
        if (dbProduct) return dbProduct as any;
      } else {
        // Find by name matching the slug fallback if requested by slug
        const dbProduct = await ProductModel.findOne({ 
          // Very basic fuzzy match if needed, but normally we rely on ID now
          $or: [
            { name: { $regex: new RegExp(id.replace(/-/g, '.*'), 'i') } }
          ]
        }).lean();
        if (dbProduct) return dbProduct as any;
      }
    }
  } catch (error) {
    console.error(`MongoDB fetch failed for product ${id}:`, error);
  }
  
  // Return static product instantly without any network request overhead
  return getStaticProductById(id) || null;
}

/** Fetches related products instantly */
async function fetchRelatedProducts(excludeId: string) {
  try {
    if (process.env.MONGO_BYPASS !== 'true') {
      await dbConnect();
      const dbProducts = await ProductModel.find({ 
        _id: { $ne: excludeId },
        isActive: true
      })
      .limit(4)
      .lean();
      
      if (dbProducts && dbProducts.length > 0) {
        return dbProducts as any[];
      }
    }
  } catch(err) {
    console.log('Using static related products');
  }

  return STATIC_PRODUCTS
    .filter(p => nameToSlug(p.name) !== excludeId && p._id !== excludeId)
    .slice(0, 4);
}

// ─── Dynamic metadata ─────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

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
    fetchProduct(id),
    fetchRelatedProducts(id),
  ]);

  if (!product) notFound();

  return <ProductClient product={product} allProducts={relatedProducts} />;
}
