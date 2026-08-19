import type { Metadata } from 'next';

import Nav from '@/app/sections/Nav';
import Products from '@/app/sections/Products';
import Hero from '@/app/sections/Hero';
import FeedbackFormLazy from '@/app/sections/FeedbackFormLazy';
import Footer from '@/app/sections/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import Explore from '@/app/sections/Explore';
import { getActiveProducts } from '@/product';
import { alternatesFor, absoluteUrl } from '@/lib/locale';
import { storeJsonLd } from '@/lib/storeSchema';

export const metadata: Metadata = {
  title: { absolute: 'Unlimited SW | أجهزة كاليسثينكس صناعة مصرية' },
  description:
    'أجهزة كاليسثينكس وتمارين القوة مصنوعة في مصر: عقلة حائط، متوازي، بارليتس وحلق جمباز. أسعار بالجنيه، شحن لكل المحافظات، الدفع عند الاستلام.',
  openGraph: {
    title: 'Unlimited SW | أجهزة كاليسثينكس صناعة مصرية',
    description: 'أجهزة كاليسثينكس وتمارين القوة مصنوعة في مصر.',
    url: absoluteUrl('/ar'),
    siteName: 'Unlimited SW',
    images: [{ url: 'https://unlimited-sw.com/og-image.jpg', width: 1200, height: 630 }],
    locale: 'ar_EG',
    type: 'website',
  },
  alternates: alternatesFor('/', '/ar', 'ar'),
};

export default async function ArabicHome() {
  let initialProducts: any[] = [];
  let initialHasMore = false;

  try {
    const serialized = JSON.parse(JSON.stringify(await getActiveProducts()));
    initialProducts = serialized.slice(0, 6);
    initialHasMore = serialized.length > 6;
  } catch (error) {
    console.error('ar: failed to fetch initial products:', error);
  }

  return (
    <>
      <script type="application/ld+json" id="structured-data" suppressHydrationWarning>
        {JSON.stringify(storeJsonLd('ar'))}
      </script>

      <Nav />
      <Hero locale="ar" />
      <Products initialProducts={initialProducts} initialHasMore={initialHasMore} locale="ar" />
      <Explore locale="ar" />
      <FeedbackFormLazy />
      <Footer />
      <WhatsAppButton />
    </>
  );
}
