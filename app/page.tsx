import Nav from "./sections/Nav";
import Products from "./sections/Products";
import Hero from "./sections/Hero";
import FeedbackFormLazy from "./sections/FeedbackFormLazy";
import Footer from "./sections/Footer";
import WhatsAppButton from "../components/WhatsAppButton";
import Explore from "./sections/Explore";

export const metadata = {
  title: "Unlimited SW | Premium Calisthenics Equipment Egypt",
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
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://unlimited-sw.com");

  // Fetch products server-side — zero waterfall, instant render (first page only)
  let initialProducts = [];
  let initialHasMore = false;

  try {
    const res = await fetch(`${baseUrl}/api/products?page=1&limit=6`, {
      next: { revalidate: 1800 } // matches your 30min cache
    });
    const data = await res.json();
    if (data.success && data.products) {
      initialProducts = data.products;
      initialHasMore = data.hasMore;
    }
  } catch (error) {
    console.error('Failed to fetch initial products:', error);
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "UNLIMITED-SW",
    "description": "Premium calisthenics equipment and training gear in Egypt. Shop pull-up bars, resistance bands, gymnastic rings, and professional workout equipment.",
    "url": "https://unlimited-sw.com",
    "logo": "https://unlimited-sw.com/logo.png",
    "image": "https://unlimited-sw.com/og-image.jpg",
    "telephone": "+20-XXX-XXX-XXXX",
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
    "sameAs": [
      "https://unlimited-sw.com",
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
      {/* <FeaturedProducts /> */}
      <Explore />
      {/* <Intro /> */}
      <FeedbackFormLazy />
      <Footer />
      <WhatsAppButton />
    </>
  );
}
