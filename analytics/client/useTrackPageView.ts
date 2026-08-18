'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from './track';

/**
 * Fires PageView on every route change.
 *
 * Keyed on the pathname alone, not on search params. Two reasons, and the
 * second is the important one: `?ref=`, `?fbclid=` and friends would make every
 * shared link its own "page" and shred the report, and query strings are
 * exactly where personal data ends up in URLs. The funnel needs to know someone
 * viewed `/shop`; it does not need to know which email campaign carried them
 * there, and storing that is how a PII-free collection stops being one.
 */
export function useTrackPageView(): void {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    track('PageView', { path: pathname });
  }, [pathname]);
}
