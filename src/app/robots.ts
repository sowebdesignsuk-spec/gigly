import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gigly-gilt.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in surfaces. They redirect to login anyway; this just keeps
      // crawlers from wasting the crawl budget finding that out.
      disallow: ["/admin", "/admin-login", "/entertainer/", "/venue/", "/messages", "/notifications", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
