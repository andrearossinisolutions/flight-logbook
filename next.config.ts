import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
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
