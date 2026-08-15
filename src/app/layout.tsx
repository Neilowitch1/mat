import type { Metadata } from "next";

import "./globals.css";

import AppLayout from "@/components/AppLayout";
import { appUrl, brand } from "@/config/brand";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: brand.name,
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    url: "/",
    siteName: brand.name,
    title: brand.name,
    description: brand.description,
    images: [{ url: "/brand/open-graph.png", width: 1200, height: 630, alt: `${brand.name} – ${brand.description}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: brand.name,
    description: brand.description,
    images: ["/brand/open-graph.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brand.shortName,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: brand.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="font-sans">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
