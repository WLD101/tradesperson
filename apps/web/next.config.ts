import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",
  // outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@tradesperson/ui", "@tradesperson/types"],
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
