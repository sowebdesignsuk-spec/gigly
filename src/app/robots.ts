import type { MetadataRoute } from "next";

import { loadSettings } from "@/lib/settings/load";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await loadSettings();
  const base = settings.get("site.url");

  // The admin "Hide from search engines" switch. Site-wide and deliberately
  // blunt — it is for a site that is not ready, not for fine-tuning.
  if (settings.bool("seo.noindex")) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in surfaces. They redirect to login anyway; this just keeps
      // crawlers from wasting the crawl budget finding that out.
      // "/entertainer/" is the signed-in area; "/entertainers" is the public
      // directory. The trailing slash is what keeps them apart.
      disallow: ["/admin", "/admin-login", "/entertainer/", "/venue/", "/messages", "/notifications", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
