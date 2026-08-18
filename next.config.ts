import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Was `unoptimized: true`, which shipped every product photo at full size —
    // the single largest thing slowing the store down on mobile data.
    // Netlify's Next runtime routes next/image through its Image CDN.
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "media-src 'self' https: data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
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
