import Script from 'next/script';

/**
 * Google Analytics 4.
 *
 * Separate from `analytics/` on purpose. That folder is our own funnel — the
 * numbers we can query, join to orders, and keep after we stop paying anyone.
 * This is the third-party copy, and the two answer different questions: GA is
 * where acquisition and audience live, ours is where the checkout funnel and
 * revenue live, computed from the order transaction rather than from a browser
 * event that an ad-blocker may have eaten.
 *
 * Neither is a substitute for the other, and neither should be made to depend
 * on the other. If GA is blocked — and a meaningful share of visitors do block
 * it — our funnel is unaffected.
 *
 * `lazyOnload` (1 Nov 2026; was afterInteractive): nothing on the page waits
 * for this, and loading it early would put a third party's script in front of
 * the product images on a phone. Measurement must not cost the thing it
 * measures.
 *
 * The measurement ID is not a secret — it ships in the HTML of every page by
 * design. It lives in an environment variable anyway, so staging and local
 * development do not report into the production property and quietly corrupt
 * the numbers the business reads.
 */
export default function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;

  // Unset means off. Local and test runs send nothing.
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="lazyOnload"
      />
      <Script id="ga-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
