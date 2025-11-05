import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@sparticuz/chromium",
    "puppeteer-core",
    "puppeteer",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
  typedRoutes: false,
};

export default nextConfig;
