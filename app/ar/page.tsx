import type { Metadata } from 'next';

import Nav from '@/app/sections/Nav';
import Products from '@/app/sections/Products';
import Hero from '@/app/sections/Hero';
import FeedbackSection from '@/app/sections/feedback/FeedbackSection';
import Footer from '@/app/sections/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getStoreContact } from '@/payments/contact';
import Featured from '@/app/sections/Featured';
import CounterDown from '@/app/sections/CounterDown';
import { getActiveProducts } from '@/product';
import { alternatesFor, absoluteUrl } from '@/lib/locale';
import { storeJsonLd } from '@/lib/storeSchema';
import { getFreeShippingStatus, type FreeShippingStatus } from '@/lib/freeShippingCheck';

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
  let freeShippingStatus: FreeShippingStatus = { active: false, expiresAt: null, applyToAll: true, productIds: [] };

  try {
    const serialized = JSON.parse(JSON.stringify(await getActiveProducts()));
    initialProducts = serialized.slice(0, 6);
    initialHasMore = serialized.length > 6;
  } catch (error) {
    console.error('ar: failed to fetch initial products:', error);
  }

  try {
    freeShippingStatus = await getFreeShippingStatus();
  } catch (error) {
    console.error('ar: failed to fetch free shipping status:', error);
  }

  return (
    <>
      <script type="application/ld+json" id="structured-data" suppressHydrationWarning>
        {JSON.stringify(storeJsonLd('ar'))}
      </script>

      <Nav />
      <Hero locale="ar" />
      <CounterDown
        initialActive={freeShippingStatus.active}
        initialExpiresAt={freeShippingStatus.expiresAt}
        initialApplyToAll={freeShippingStatus.applyToAll}
      />
      <Products initialProducts={initialProducts} initialHasMore={initialHasMore} locale="ar" />
      <Featured locale="ar" />
      <FeedbackSection locale="ar" />
      <Footer />
      <WhatsAppButton phone={(await getStoreContact()).whatsapp} />
    </>
  );
}
