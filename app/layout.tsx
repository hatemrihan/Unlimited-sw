import type { Metadata } from "next";
import "./globals.css";
import { cn } from "../lib/utils";
import { CartProvider } from "../contexts/CartContext";
import SessionWrapper from "../components/SessionWrapper";


export const metadata: Metadata = {
  title: "UNLIMITED-SW",
  description: "build, train and cross the limited to be UNLIMITED",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body
  className={cn(`antialiased bg-black text-[#b3b3b3] transition-colors duration-300 font-sans`)}
>
  <SessionWrapper>
    <CartProvider>
      {children}
    </CartProvider>
  </SessionWrapper>
</body>

    </html>
  );
}
