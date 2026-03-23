import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Server-side data fetch ───────────────────────────────────────────────────
async function fetchProduct(id: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://unlimited-sw.com';

  try {
    const res = await fetch(`${baseUrl}/api/products/${id}`, {
      next: { revalidate: 600 }, // 10-min ISR — matches the API cache TTL
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.product ?? null;
  } catch {
    return null;
  }
}

async function fetchAllProducts() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://unlimited-sw.com';

  try {
    const res = await fetch(`${baseUrl}/api/products`, {
      next: { revalidate: 300 }, // 5-min ISR — matches CACHE_TTL.PRODUCTS
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products ?? [];
  } catch {
    return [];
  }
}

// ─── Dynamic metadata — unique title/description per product ─────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) {
    return { title: 'Product Not Found | Unlimited SW' };
  }

  const title = `${product.name} | Unlimited SW`;
  const description =
    product.description ||
    `Buy ${product.name} in Egypt. Premium calisthenics equipment from Unlimited SW.`;
  const image = product.mainImage || 'https://unlimited-sw.com/og-image.jpg';
  const url = `https://unlimited-sw.com/product/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Unlimited SW',
      images: [{ url: image, width: 1080, height: 1350 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
  };
}

// ─── Server Component — renders full HTML for Google ─────────────────────────
export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  // Both fetches run in parallel — no waterfall
  const [product, allProducts] = await Promise.all([
    fetchProduct(id),
    fetchAllProducts(),
  ]);

  if (!product) {
    notFound();
  }

  return <ProductClient product={product} allProducts={allProducts} />;
}
