import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Ensure these are treated as external in server components/functions
    serverComponentsExternalPackages: [
      "@sparticuz/chromium",
      "puppeteer-core",
      "puppeteer",
    ],
  },
};

export default nextConfig;
