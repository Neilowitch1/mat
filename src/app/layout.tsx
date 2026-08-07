import type { Metadata } from "next";

import "./globals.css";

import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "Mat",
  description: "Smart matplanering",
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
