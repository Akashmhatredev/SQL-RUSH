import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Bulk question uploads are sent in batches of 200 through a Server Action.
    serverActions: { bodySizeLimit: "2mb" },
  },
  async redirects() {
    return [{ source: "/stats", destination: "/dashboard", permanent: true }];
  },
};

export default nextConfig;
