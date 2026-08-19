import type { Metadata } from 'next';
import ShopClient from './ShopClient';
import { getActiveProducts } from '@/product/actions';
import { alternatesFor } from '@/lib/locale';

export const metadata: Metadata = {
  title: 'Shop Calisthenics Equipment in Egypt',
  description:
    'Wall-mounted pull-up bars, dip & parallel bars, parallettes and calisthenics gear made in Egypt. Prices in EGP, delivery across Egypt, cash on delivery.',
  alternates: alternatesFor('/shop', '/ar/shop', 'en'),
  openGraph: {
    title: 'Shop Calisthenics Equipment in Egypt | Unlimited SW',
    url: 'https://unlimited-sw.com/shop',
    type: 'website',
  },
};

/**
 * The catalogue is read here, on the server, so the HTML Google receives already
 * contains a link to every product. The old version was a client component that
 * fetched /api/products in useEffect — crawlers saw an empty grid.
 *
 * Filtering and search stay in ShopClient; nothing changes for the visitor.
 */
export default async function ShopPage() {
  let products: any[] = [];

  try {
    // Serialize: Mongoose documents and ObjectIds can't cross to a client component.
    products = JSON.parse(JSON.stringify(await getActiveProducts()));
  } catch (e) {
    console.error('shop: product fetch failed', e);
  }

  return <ShopClient initialProducts={products} />;
}
