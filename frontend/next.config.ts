import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/:path*`,
      },
      {
        source: "/docs",
        destination: `${backendUrl.replace(/\/$/, "")}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${backendUrl.replace(/\/$/, "")}/openapi.json`,
      },
    ];
  },
};

export default nextConfig;
