import type { NextConfig } from "next";

/**
 * The coaching platform's origin, named in `connect-src`. `https:` already
 * covers production; this is what lets a dev server pointed at the local
 * stack (http://127.0.0.1:54321) reach it. Without it the browser blocked
 * every coach-apply request before it left, and supabase-js reported an
 * empty error (`{}`) — found 12 Sep 2026.
 */
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin;
  } catch {
    return '';
  }
})();

const nextConfig: NextConfig = {
  experimental: {
    // Lets app/global-not-found.tsx answer unknown URLs. Needed because each
    // language has its own root layout, so no layout wraps an unmatched path.
    globalNotFound: true,
  },
  images: {
    /**
     * Re-enabled after removing the SPA fallback in `public/_redirects`.
     *
     * The fallback (`/* /index.html 200`) was making the optimizer receive
     * HTML instead of the actual image file, which caused every `/_next/image`
     * request to 400. With the fallback gone, the optimizer fetches the real
     * file and serves WebP/AVIF at the requested size.
     */
    unoptimized: false,
    /**
     * Every distinct (image, width, quality, format) is one transformation, and
     * Vercel's Hobby plan includes 5,000 a month. The settings below are what
     * keep the store inside that — 75% of it was gone in two days (22 Oct 2026).
     *
     * One format: AVIF + WebP made every image twice. WebP alone is supported
     * by every browser the store's customers use.
     */
    formats: ['image/webp'],
    /**
     * How long a transformed image stays cached, in seconds (31 days).
     *
     * The S3 product photos are served with no Cache-Control header, so the
     * default of 60 seconds applied: a minute after an image was optimised it
     * went stale, and the next visitor paid for a fresh transformation.
     * Uploads get a new file name, so a long cache never shows an old photo.
     */
    minimumCacheTTL: 2678400,
    /**
     * The widths an image can be cut to. The defaults are 16 widths, up to
     * 3840px; a `fill` image without a narrow `sizes` asked for nearly all of
     * them. These cover phones (640, 828), tablets (1080) and desktops (1920),
     * plus the small thumbnails.
     */
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [64, 128, 256],
    // `domains` is deprecated in favour of remotePatterns.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: `${process.env.ALKADY_AWS_S3_BUCKET_NAME}.s3.${process.env.ALKADY_AWS_REGION}.amazonaws.com`,
      },
    ],
    // 75 is the default for every image; 90 is the before/after slider in
    // Explore, which used to ask for 100 (several MB per image, no visible gain).
    qualities: [75, 90],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // googletagmanager.com serves gtag.js. `connect-src` below is
              // already `https:`, which covers where GA sends its hits — but
              // scripts are named explicitly, because an open script-src is the
              // one that turns any injection into a full compromise.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "media-src 'self' https: data: blob:",
              "font-src 'self' data:",
              `connect-src 'self' https: ${supabaseOrigin}`.trim(),
              "form-action 'self' https://accounts.google.com",
              "frame-src 'self' https://accounts.google.com",
            ].join('; '),
          },
        ],
      },
      // App links (30 Oct 2026): Apple reads this extension-less file as JSON
      // and wants it served as JSON. public/_headers said so, but that file is
      // Netlify's — Vercel never reads it, and served octet-stream. Both files
      // short-cached, so a fix reaches the phones within the hour.
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
    ];
  },
};

export default nextConfig;
