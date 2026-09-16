'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { trackMetaPageView } from '../../analytics/client/metaPixel';

/**
 * Meta (Facebook) Pixel — bootstrap and route tracker.
 *
 * Same philosophy as GoogleAnalytics.tsx: a third-party measurement script that
 * runs independently of our own funnel analytics.  Meta Pixel feeds ad
 * attribution and retargeting audiences — our internal analytics feeds the
 * conversion report.  Neither depends on the other.
 *
 * The pixel ID lives in `NEXT_PUBLIC_META_PIXEL_ID`.  Unset means off — local
 * development and preview deploys never report into the production property.
 *
 * `beforeInteractive` so the `fbq` queue exists by the time React hydrates and
 * the first route-change effect fires.  The external library (fbevents.js) is
 * still loaded asynchronously, so it does not delay first paint.
 *
 * The inline PageView that Meta's snippet template includes has been removed.
 * `MetaPixelRouteTracker` fires PageView on every `usePathname()` change
 * instead, which covers both the initial load and client-side navigations
 * without duplicating the first one.
 */
function MetaPixelRouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackMetaPageView();
  }, [pathname]);

  return null;
}

export default function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  if (!pixelId) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="beforeInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
        `}
      </Script>
      <MetaPixelRouteTracker />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
