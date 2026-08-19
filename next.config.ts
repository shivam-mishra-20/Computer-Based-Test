import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `@platform/client-core` is a local `file:` dependency, which npm installs
   * as a symlink to a sibling directory. Turbopack will not follow a resolution
   * out of the project root unless told where the real root is, so the build
   * failed with "Can't resolve '@platform/client-core'" on every file that
   * imports it.
   *
   * Pointing `root` at the directory that contains BOTH repositories makes the
   * symlink target an in-root path. It changes nothing about the output.
   */
  turbopack: {
    root: path.join(__dirname, ".."),
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

