import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "../lib/utils";
import { CartProvider } from "../contexts/CartContext";
import { Toaster } from 'sonner';
import GoogleAnalytics from './components/GoogleAnalytics';
import AnalyticsProvider from './components/AnalyticsProvider';



export const metadata: Metadata = {
  title: {
    default: 'Unlimited SW – Calisthenics Equipment Made in Egypt',
    template: '%s | Unlimited SW'
  },
  description: "Premium calisthenics equipment and training gear in Egypt. Shop pull-up bars, resistance bands, gymnastic rings, and professional workout equipment. Build strength, train unlimited with Unlimited SW.",
  authors: [{ name: 'Unlimited SW', url: 'https://unlimited-sw.com' }],
  creator: 'Unlimited SW',
  publisher: 'Unlimited SW',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://unlimited-sw.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Unlimited SW – Calisthenics Equipment Made in Egypt',
    description: "Premium calisthenics equipment and training gear in Egypt. Shop pull-up bars, resistance bands, gymnastic rings, and professional workout equipment.",
    url: 'https://unlimited-sw.com',
    siteName: 'Unlimited SW',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Unlimited SW Calisthenics Equipment',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unlimited SW – Calisthenics Equipment Made in Egypt',
    description: "Premium calisthenics equipment and training gear in Egypt. Build strength, train unlimited.",
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={cn(`antialiased bg-stone-900 text-[#b3b3b3] transition-colors duration-300 font-sans`)}
      >
        {/* SessionProvider lives in app/admin/layout.tsx, not here — see the
            comment there. The storefront has no signed-in state, and wrapping
            it cost every anonymous shopper a session request on mount, another
            every five minutes, and another on every tab switch. */}
        <CartProvider>
          <AnalyticsProvider />
          {children}
          <Toaster position="top-right" />
        </CartProvider>
        <GoogleAnalytics />
      </body>

    </html>
  );
}
