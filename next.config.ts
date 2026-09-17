import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `@platform/client-core` is vendored into this repository at
   * `vendor/client-core` and installed from there (`file:./vendor/client-core`),
   * so npm symlinks it to a path INSIDE the project root.
   *
   * This used to be `file:../platform-client-core` — a sibling repo that exists
   * only on a developer machine. Turbopack will not follow a resolution out of
   * the project root, so the root was widened to the parent directory to make
   * that symlink reachable. On Vercel the parent directory holds no such
   * sibling, and the build failed with "Can't resolve '@platform/client-core'"
   * on every file that imports it.
   *
   * The root is the project itself again. Nothing resolves outside it.
   */
  turbopack: {
    root: __dirname,
  },
  transpilePackages: ["@platform/client-core"],
  serverExternalPackages: [
    "@sparticuz/chromium",
    "puppeteer-core",
    "puppeteer",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
  typedRoutes: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;

