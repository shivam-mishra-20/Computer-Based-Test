import type { Metadata } from "next";
import React, { Suspense } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "../components/navbar";
import { Toaster } from "sonner";
import { TenantProvider } from "../lib/tenant/context";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Exam Portal",
  description: "A platform for creating and taking computer-based tests",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
          integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${poppins.variable} antialiased`}>
        {/* One `/api/me/context` for the whole tree: organization, branding,
            modules, permissions and configuration. It resolves to null on a
            pinned api-legacy deployment, and everything below behaves exactly
            as it did before tenancy existed when it does. */}
        <TenantProvider>
          {/* Navbar and other client components must be rendered inside a Suspense boundary
              to allow client-side hooks like useSearchParams/usePathname to work during
              server rendering without causing a CSR bailout error. */}
          <Suspense fallback={<div style={{ height: 64 }} />}>
            <Navbar />
          </Suspense>

          {/* Page content (children) may include client components too — wrap in Suspense */}
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>

          <Suspense fallback={null}>
            <Toaster richColors position="top-right" />
          </Suspense>
        </TenantProvider>
      </body>
    </html>
  );
}
