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
  },
  twitter: {
    card: "summary",
    title: brand.name,
    description: brand.description,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brand.shortName,
  },
  icons: {
    icon: "/brand/app-icon-192-placeholder.svg",
    apple: "/brand/app-icon-192-placeholder.svg",
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
