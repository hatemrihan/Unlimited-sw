import StoreShell, { storeMetadata, storeViewport } from '@/app/components/StoreShell';

/**
 * Root layout for every English page — and the admin, which lives here too.
 * `app/ar/layout.tsx` is the other root layout; StoreShell explains why there
 * are two.
 */
export const metadata = storeMetadata;
export const viewport = storeViewport;

export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StoreShell locale="en">{children}</StoreShell>;
}
