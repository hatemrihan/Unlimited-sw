import type { Metadata } from 'next';

// page.tsx is a client component and cannot export metadata. Checkout is a
// private, per-visitor step — noindex.
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
