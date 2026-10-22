'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Product page crash:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-900 text-[#b3b3b3]">
      <Nav />
      <div className="flex-1 flex flex-col items-center justify-center p-4 pt-24 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Something went wrong!</h2>
        <p className="max-w-md mx-auto mb-8 text-gray-400">
          We encountered an error loading this product. It may have been removed or there is a temporary issue.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="border border-white text-white px-6 py-2 uppercase tracking-wide text-sm font-medium hover:bg-white hover:text-black transition-colors"
          >
            Try again
          </button>
          <Link
            href="/shop"
            className="bg-white text-black px-6 py-2 uppercase tracking-wide text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Go to Shop
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
