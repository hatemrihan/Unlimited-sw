import type { Metadata } from 'next';

import ShopClient from '@/app/shop/ShopClient';
import { getActiveProducts } from '@/product';
import { alternatesFor, absoluteUrl } from '@/lib/locale';

export const metadata: Metadata = {
  title: 'تسوق أجهزة الكاليسثينكس في مصر',
  description:
    'عقلة حائط، متوازي، بارليتس وأجهزة كاليسثينكس مصنوعة في مصر. أسعار بالجنيه المصري، شحن لكل المحافظات، الدفع عند الاستلام.',
  openGraph: {
    title: 'تسوق أجهزة الكاليسثينكس في مصر | Unlimited SW',
    url: absoluteUrl('/ar/shop'),
    type: 'website',
    locale: 'ar_EG',
  },
  alternates: alternatesFor('/shop', '/ar/shop', 'ar'),
};

export default async function ArabicShopPage() {
  let products: any[] = [];

  try {
    products = JSON.parse(JSON.stringify(await getActiveProducts()));
  } catch (e) {
    console.error('ar/shop: product fetch failed', e);
  }

  return <ShopClient initialProducts={products} locale="ar" />;
}
