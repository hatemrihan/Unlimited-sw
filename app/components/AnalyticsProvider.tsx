'use client';

import { useEffect } from 'react';
import { useTrackPageView } from '../../analytics/client/useTrackPageView';
import { flushOnHide } from '../../analytics/client/track';

/**
 * Mounts the funnel tracker once, for the whole storefront.
 *
 * Renders nothing. It exists because page views and the flush-on-exit both need
 * a client component that lives for the life of the tab, and the root layout is
 * a server component.
 */
export default function AnalyticsProvider() {
  useTrackPageView();

  useEffect(() => {
    /**
     * `pagehide` and `visibilitychange`, not `beforeunload`.
     *
     * `beforeunload` is unreliable on mobile Safari and Chrome for Android —
     * which is most of this shop's traffic — because a tab switched away from
     * and later discarded never fires it. `pagehide` does, and
     * `visibilitychange` catches the case where the app is backgrounded and
     * never returns. Between them they cover the way phones actually close
     * pages, which is by wandering off rather than by clicking a close button.
     */
    const onHide = () => flushOnHide();

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushOnHide();
    };

    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      // Unmounting is itself an exit — send what is queued rather than dropping it.
      flushOnHide();
    };
  }, []);

  return null;
}
