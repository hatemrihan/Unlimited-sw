import type { Locale } from '@/lib/locale';

/**
 * The store's own structured data, shared by both homepages.
 *
 * It lived inline in app/page.tsx. Copying it into the Arabic homepage would
 * have meant two definitions of the same business drifting apart — and Google
 * reading two different descriptions of one shop is worse than reading one.
 *
 * `telephone` is deliberately absent until the owner supplies a real number in
 * E.164 form. A placeholder here is worse than nothing: Google would publish it.
 */
export function storeJsonLd(locale: Locale) {
  const isArabic = locale === 'ar';

  return {
    '@context': 'https://schema.org',
    // SportingGoodsStore is a subtype of Store/LocalBusiness — it tells Google
    // what kind of shop this is, which plain "Store" does not.
    '@type': 'SportingGoodsStore',
    name: 'Unlimited SW',
    description: isArabic
      ? 'أجهزة كاليسثينكس وتمارين قوة مصنوعة في مصر: عقلة حائط، متوازي، بارليتس وحلق جمباز.'
      : 'Calisthenics and strength equipment made in Egypt: wall-mounted pull-up bars, dip and parallel bars, parallettes and gymnastic rings.',
    url: isArabic ? 'https://unlimited-sw.com/ar' : 'https://unlimited-sw.com',
    logo: 'https://unlimited-sw.com/logo.png',
    image: 'https://unlimited-sw.com/og-image.jpg',
    email: 'Muhamed.alkady@gmail.com',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'EG',
      addressLocality: 'Cairo',
      addressRegion: 'Cairo',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '30.0444',
      longitude: '31.2357',
    },
    openingHours: 'Mo-Su 09:00-21:00',
    areaServed: { '@type': 'Country', name: 'Egypt' },
    paymentAccepted: ['Cash', 'Credit Card', 'InstaPay'],
    currenciesAccepted: 'EGP',
    priceRange: '$$',
    inLanguage: isArabic ? 'ar-EG' : 'en-EG',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: isArabic ? 'أجهزة الكاليسثينكس' : 'Calisthenics Equipment',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: isArabic ? 'عقلة حائط' : 'Pull-up bars', category: 'Fitness Equipment' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: isArabic ? 'متوازي' : 'Dip & parallel bars', category: 'Fitness Equipment' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: isArabic ? 'بارليتس' : 'Parallettes', category: 'Fitness Equipment' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: isArabic ? 'حلق جمباز' : 'Gymnastic rings', category: 'Fitness Equipment' } },
      ],
    },
    founder: {
      '@type': 'Person',
      name: isArabic ? 'د. محمد القاضي' : 'Dr. Mohamed Alkady',
      jobTitle: isArabic ? 'المؤسس ومدرب كاليسثينكس' : 'Founder & Calisthenics Coach',
      description: isArabic
        ? 'دكتوراه في الميكانيكا الحيوية للتدريب الرياضي وأكثر من ١٤ عاماً في التدريب.'
        : 'Ph.D. in Biomechanics in Sports Training with over 14 years of coaching experience.',
    },
    // A site is not "sameAs" itself. TikTok and YouTube go here once the owner
    // sends the real URLs.
    sameAs: [
      'https://www.instagram.com/unlimited_sw',
      'https://www.facebook.com/unlimited.sw',
    ],
  };
}
