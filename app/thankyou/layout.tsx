import type { Metadata } from 'next';

// page.tsx is a client component and cannot export metadata. An order
// confirmation is meaningless out of context — noindex.
export const metadata: Metadata = {
  title: 'Thank You',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
