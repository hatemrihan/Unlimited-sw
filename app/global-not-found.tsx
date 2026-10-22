import type { Metadata } from 'next';
import Link from 'next/link';
import '@/app/globals.css';

/**
 * The 404 for addresses that match no page at all.
 *
 * With two root layouts (see app/components/StoreShell.tsx) no single layout
 * wraps an unknown URL, so Next would answer with its bare white page. This
 * renders its own <html> on the store's dark background instead. Needs
 * `experimental.globalNotFound` in next.config.ts.
 *
 * A product or guide that no longer exists still gets the 404 inside its own
 * language's layout — this only covers addresses that were never pages.
 */
export const metadata: Metadata = {
  title: 'Page not found | Unlimited SW',
};

export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr">
      <body className="antialiased bg-stone-900 text-[#b3b3b3] font-sans min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-sm">404 | This page could not be found.</p>
        <p className="text-sm" dir="rtl" lang="ar">هذه الصفحة غير موجودة.</p>
        <div className="flex gap-6 text-sm text-white">
          <Link href="/" className="underline underline-offset-4">Home</Link>
          <Link href="/ar" className="underline underline-offset-4" lang="ar">الرئيسية</Link>
        </div>
      </body>
    </html>
  );
}
