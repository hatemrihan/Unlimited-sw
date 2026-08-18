import Nav from "./sections/Nav";
import Products from "./sections/Products";
import Hero from "./sections/Hero";
import FeedbackFormLazy from "./sections/FeedbackFormLazy";
import Footer from "./sections/Footer";
import WhatsAppButton from "../components/WhatsAppButton";
import Explore from "./sections/Explore";
import { getActiveProducts } from "@/product/actions";

export const metadata = {
  // `absolute` — the brand is already in this title; the root template must not
  // append it a second time.
  title: { absolute: "Unlimited SW | Calisthenics Equipment Made in Egypt" },
  description:
    "Shop professional calisthenics equipment in Egypt. Pull-up bars, resistance bands, gymnastic rings, and workout gear.",
  keywords: [
    "calisthenics equipment Egypt",
    "pull-up bars Egypt",
    "resistance bands Egypt",
    "gymnastic rings Egypt",
    "معدات كاليستنكس في مصر",
  ],
  openGraph: {
    title: "Unlimited SW | Calisthenics Equipment Egypt",
    description: "Premium calisthenics equipment and training gear in Egypt.",
    url: "https://unlimited-sw.com",
    siteName: "Unlimited SW",
    images: [
      {
        url: "https://unlimited-sw.com/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unlimited SW",
    description: "Premium calisthenics equipment in Egypt.",
    images: ["https://unlimited-sw.com/og-image.jpg"],
  },
  alternates: {
    canonical: "https://unlimited-sw.com",
  },
};

export default async function Home() {
  // Fetch products directly from database — NO self-referencing HTTP fetch.
  // The old `fetch(baseUrl/api/products)` caused circular request failures on
  // Vercel serverless, making MongoDB appear "down" and triggering static fallback.
  let initialProducts: any[] = [];
  let initialHasMore = false;

  try {
    const allProducts = await getActiveProducts();
    // Serialize for client: strip Mongoose internals, convert ObjectIds to strings
    const serialized = JSON.parse(JSON.stringify(allProducts));
    initialProducts = serialized.slice(0, 6);
    initialHasMore = serialized.length > 6;
  } catch (error) {
    console.error('Failed to fetch initial products:', error);
  }

  const structuredData = {
    "@context": "https://schema.org",
    // SportingGoodsStore is a subtype of Store/LocalBusiness — it tells Google
    // what kind of shop this is, which plain "Store" does not.
    "@type": "SportingGoodsStore",
    "name": "Unlimited SW",
    "description": "Premium calisthenics equipment and training gear in Egypt. Shop pull-up bars, resistance bands, gymnastic rings, and professional workout equipment.",
    "url": "https://unlimited-sw.com",
    "logo": "https://unlimited-sw.com/logo.png",
    "image": "https://unlimited-sw.com/og-image.jpg",
    // "telephone" is intentionally absent until the owner supplies the real
    // number in E.164 form (+20XXXXXXXXXX). A placeholder here is worse than
    // nothing — Google would publish it.
    "email": "Muhamed.alkady@gmail.com",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "EG",
      "addressLocality": "Cairo",
      "addressRegion": "Cairo"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "30.0444",
      "longitude": "31.2357"
    },
    "openingHours": "Mo-Su 09:00-21:00",
    "areaServed": {
      "@type": "Country",
      "name": "Egypt"
    },
    "paymentAccepted": ["Cash", "Credit Card", "InstaPay"],
    "currenciesAccepted": "EGP",
    "priceRange": "$$",
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Calisthenics Equipment",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Pull-up Bars",
            "category": "Fitness Equipment"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Resistance Bands",
            "category": "Fitness Equipment"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Gymnastic Rings",
            "category": "Fitness Equipment"
          }
        }
      ]
    },
    "founder": {
      "@type": "Person",
      "name": "Mohamed Alkady",
      "jobTitle": "Founder & Calisthenics Coach",
      "description": "Ph.D. in Biomechanics in Sports Training with over 14 years of coaching experience"
    },
    // A site is not "sameAs" itself — that entry is removed. TikTok and YouTube
    // go here once the owner sends the real URLs.
    "sameAs": [
      "https://www.instagram.com/unlimited_sw",
      "https://www.facebook.com/unlimited.sw"
    ]
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        id="structured-data"
        suppressHydrationWarning
      >
        {JSON.stringify(structuredData)}
      </script>

      <Nav />
      <Hero />
      {/* <CounterDown /> */}
      <Products initialProducts={initialProducts} initialHasMore={initialHasMore} />
      <Explore />
      {/* <Intro /> */}
      <FeedbackFormLazy />
      <Footer />
      <WhatsAppButton />
    </>
  );
}
