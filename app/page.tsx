import Nav from "./sections/Nav";
import Products from "./sections/Products";
import Hero from "./sections/Hero";
import FeedbackFormLazy from "./sections/FeedbackFormLazy";
import Footer from "./sections/Footer";
import WhatsAppButton from "../components/WhatsAppButton";
import { getStoreContact } from "@/payments/contact";
import Explore from "./sections/Explore";
import { getActiveProducts } from "@/product/actions";
import { storeJsonLd } from "@/lib/storeSchema";
import { alternatesFor } from "@/lib/locale";
import CounterDown from "./sections/CounterDown";
import { getFreeShippingStatus, type FreeShippingStatus } from "@/lib/freeShippingCheck";

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
  alternates: alternatesFor('/', '/ar', 'en'),
};

export default async function Home() {
  // Fetch products directly from database — NO self-referencing HTTP fetch.
  // The old `fetch(baseUrl/api/products)` caused circular request failures on
  // Vercel serverless, making MongoDB appear "down" and triggering static fallback.
  let initialProducts: any[] = [];
  let initialHasMore = false;

  let freeShippingStatus: FreeShippingStatus = { active: false, expiresAt: null, applyToAll: true, productIds: [] };

  try {
    const allProducts = await getActiveProducts();
    // Serialize for client: strip Mongoose internals, convert ObjectIds to strings
    const serialized = JSON.parse(JSON.stringify(allProducts));
    initialProducts = serialized.slice(0, 6);
    initialHasMore = serialized.length > 6;
  } catch (error) {
    console.error('Failed to fetch initial products:', error);
  }

  try {
    freeShippingStatus = await getFreeShippingStatus();
  } catch (error) {
    console.error('Failed to fetch free shipping status:', error);
  }

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        id="structured-data"
        suppressHydrationWarning
      >
        {JSON.stringify(storeJsonLd('en'))}
      </script>

      <Nav />
      <Hero />
      <CounterDown
        initialActive={freeShippingStatus.active}
        initialExpiresAt={freeShippingStatus.expiresAt}
        initialApplyToAll={freeShippingStatus.applyToAll}
      />
      <Products initialProducts={initialProducts} initialHasMore={initialHasMore} />
      <Explore />
      {/* <Intro /> */}
      <FeedbackFormLazy />
      <Footer />
      <WhatsAppButton phone={(await getStoreContact()).whatsapp} />
    </>
  );
}
