import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/logbook",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
