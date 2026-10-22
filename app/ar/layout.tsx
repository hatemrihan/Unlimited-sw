import StoreShell, { storeMetadata, storeViewport } from '@/app/components/StoreShell';

/**
 * Root layout for every Arabic page: <html lang="ar" dir="rtl">, known at
 * build time. `app/(en)/layout.tsx` is the other root layout; StoreShell
 * explains why there are two.
 */
export const metadata = storeMetadata;
export const viewport = storeViewport;

export default function ArabicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StoreShell locale="ar">{children}</StoreShell>;
}
