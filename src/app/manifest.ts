import type { MetadataRoute } from "next";

import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: brand.backgroundColor,
    theme_color: brand.themeColor,
    lang: "sv",
    orientation: "portrait-primary",
    icons: [
      { src: "/brand/app-icon-192-placeholder.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/brand/app-icon-512-placeholder.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  };
}
