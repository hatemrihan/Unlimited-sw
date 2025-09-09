import Nav from "./sections/Nav";
import Intro from "./sections/Intro";
import Products from "./sections/Products";
import MovingWords from "./sections/MovingWords";
import Hero from "./sections/Hero";
import FeaturedProducts from "./sections/FeaturedProducts";
import FeedbackForm from "./sections/FeedbackForm";
import Footer from "./sections/Footer";
import WhatsAppButton from "../components/WhatsAppButton";
import MovingWordsTwo from "./sections/MovingWordsTwo";

export default function Home() {
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
      
      <Nav/>
      <Hero /> 
      <MovingWordsTwo />
      <Products />
      <FeaturedProducts />
      <MovingWords />
      <Intro />
      <FeedbackForm />
      <Footer />
      <WhatsAppButton />
    </>
  );
}
