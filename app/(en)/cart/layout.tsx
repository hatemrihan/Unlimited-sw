import type { Metadata } from 'next';

// page.tsx is a client component and cannot export metadata, so the title and
// the noindex live here. A cart is per-visitor — there is nothing for Google to rank.
export const metadata: Metadata = {
  title: 'Your Cart',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
