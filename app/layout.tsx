import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "../lib/utils";
import { CartProvider } from "../contexts/CartContext";
import SessionWrapper from "../components/SessionWrapper";
import { Toaster } from 'sonner';



export const metadata: Metadata = {
  title: {
    default: "UNLIMITED-SW - Premium Calisthenics Equipment & Training Gear",
    template: "%s | UNLIMITED-SW"
  },
  description: "Premium calisthenics equipment and training gear in Egypt. Shop pull-up bars, resistance bands, gymnastic rings, and professional workout equipment. Build strength, train unlimited with UNLIMITED-SW.",
  keywords: [
    "calisthenics equipment",
    "pull up bars",
    "resistance bands",
    "gymnastic rings",
    "workout equipment",
    "fitness gear",
    "bodyweight training",
    "home gym equipment",
    "Egypt fitness",
    "Cairo gym equipment",
    "strength training",
    "unlimited sw",
    "unlimited-sw",
    "Mohamed Alkady",
    "calisthenics Egypt",
    "fitness equipment Cairo"
  ],
  authors: [{ name: "UNLIMITED-SW", url: "https://unlimited-sw.com" }],
  creator: "UNLIMITED-SW",
  publisher: "UNLIMITED-SW",
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
    title: "UNLIMITED-SW - Premium Calisthenics Equipment & Training Gear",
    description: "Premium calisthenics equipment and training gear in Egypt. Shop pull-up bars, resistance bands, gymnastic rings, and professional workout equipment.",
    url: 'https://unlimited-sw.com',
    siteName: 'UNLIMITED-SW',
    images: [
      {
        url: '/one-image.jpg',
        width: 1200,
        height: 630,
        alt: 'UNLIMITED-SW Calisthenics Equipment',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "UNLIMITED-SW - Premium Calisthenics Equipment",
    description: "Premium calisthenics equipment and training gear in Egypt. Build strength, train unlimited.",
    images: ['/one-image.jpg'],
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
        <SessionWrapper>
          <CartProvider>
            {children}
            <Toaster position="top-right" />
          </CartProvider>
        </SessionWrapper>
      </body>

    </html>
  );
}
