import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { STATIC_PRODUCTS, getStaticProductById, nameToSlug } from '../../../data/products';

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Direct Server-side data (Instant Fallback Mode) ──────────────────────────
async function fetchProduct(id: string) {
  // Return static product instantly without any network request overhead
  return getStaticProductById(id) || null;
}

/** Fetches related products instantly without network routing */
async function fetchRelatedProducts(excludeSlug: string) {
  return STATIC_PRODUCTS
    .filter(p => nameToSlug(p.name) !== excludeSlug && p._id !== excludeSlug)
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
