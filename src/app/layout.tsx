import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

import "./globals.css";

import AppLayout from "@/components/AppLayout";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

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
      <body className={cn("font-sans", geist.variable)}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}