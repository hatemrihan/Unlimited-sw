import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      `${process.env.ALKADY_AWS_S3_BUCKET_NAME}.s3.${process.env.ALKADY_AWS_REGION}.amazonaws.com`,
    ],
    qualities: [75, 85, 100],
  },
};

export default nextConfig;
