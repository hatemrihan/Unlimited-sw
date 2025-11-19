import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Set build time as an environment variable during build
  // This will be available to the client-side code
  ...(process.env.NEXT_PUBLIC_BUILD_TIME ? {} : {
    env: {
      NEXT_PUBLIC_BUILD_TIME: Date.now().toString(),
    }
  }),
};

export default nextConfig;
