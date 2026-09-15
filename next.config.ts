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
  images: {
    /**
     * Optimization is OFF, and turning it on again needs a fix elsewhere first.
     *
     * It was switched on to stop shipping full-size product photos over mobile
     * data — a real and worthwhile goal. But on this deployment every
     * `/_next/image` request answers **400 — "The requested resource isn't a
     * valid image"**, so nothing rendered through `next/image` appeared at all:
     * the hero, the Explore slider, the logo, every product photo. The raw
     * files serve fine (`/images/newmobile-image.JPG` returns 200); it is the
     * optimizer in front of them that fails.
     *
     * The cause is almost certainly the SPA fallback in `public/_redirects`:
     *
     *     /*  /index.html  200
     *
     * That line belongs to a single-page app, not to a Next server-rendered
     * one. The optimizer fetches the source image over HTTP, that catch-all
     * hands it `index.html`, and Next quite correctly reports that what came
     * back is not an image.
     *
     * Removing the fallback is the real fix and is very likely safe — this app
     * has never been an SPA — but it changes how EVERY unmatched route is
     * served, and that cannot be verified from a local machine. Unoptimized
     * images are a performance problem; invisible images are a broken shop. So
     * this goes back to the setting that demonstrably worked, and the redirect
     * gets fixed and observed on its own.
     */
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    // `domains` is deprecated in favour of remotePatterns.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: `${process.env.ALKADY_AWS_S3_BUCKET_NAME}.s3.${process.env.ALKADY_AWS_REGION}.amazonaws.com`,
      },
    ],
    qualities: [50, 75, 85, 100],
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com",
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
    ];
  },
};

export default nextConfig;
