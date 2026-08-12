import type { MetadataRoute } from "next";

import { appUrl } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/onboarding", "/installningar"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
