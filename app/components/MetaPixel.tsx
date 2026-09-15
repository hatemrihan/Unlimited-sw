import Script from 'next/script';

/**
 * Meta (Facebook) Pixel.
 *
 * Same philosophy as GoogleAnalytics.tsx: a third-party measurement script that
 * runs independently of our own funnel analytics.  Meta Pixel feeds ad
 * attribution and retargeting audiences — our internal analytics feeds the
 * conversion report.  Neither depends on the other.
 *
 * The pixel ID is hardcoded because it is public by design (it ships in the
 * HTML).  If you ever need to swap it per-environment, move it to an env var
 * like GA does.
 *
 * `afterInteractive` for the same reason as GA: nothing on the page waits for
 * this, and first paint must not be blocked by a tracking script.
 */
const META_PIXEL_ID = '28393868796876018';

export default function MetaPixel() {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
