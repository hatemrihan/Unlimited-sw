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
     * Re-enabled after removing the SPA fallback in `public/_redirects`.
     *
     * The fallback (`/* /index.html 200`) was making the optimizer receive
     * HTML instead of the actual image file, which caused every `/_next/image`
     * request to 400. With the fallback gone, the optimizer fetches the real
     * file and serves WebP/AVIF at the requested size.
     */
    unoptimized: false,
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
    ];
  },
};

export default nextConfig;
