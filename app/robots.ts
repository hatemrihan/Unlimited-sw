import { MetadataRoute } from 'next';

/**
 * Cloudflare prepends its own managed block to this response. Our rules land
 * after it — which is where the Sitemap line and the /admin disallow live.
 *
 * Do not add a static public/robots.txt: a file there wins over this route, and
 * production would then serve only Cloudflare's block. The regression test in
 * __tests__/seo-robots-sitemap.test.ts guards that.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/cart',
          '/checkout',
          '/thankyou',
          '/debug-auth',
          '/env-check',
          '/access-denied',
          '/login',
        ],
      },
    ],
    sitemap: 'https://unlimited-sw.com/sitemap.xml',
    host: 'https://unlimited-sw.com',
  };
}
