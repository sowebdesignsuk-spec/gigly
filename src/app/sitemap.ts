import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";

/**
 * Sitemap — Section 5, Week 8.4, the other half of "SEO-friendly".
 *
 * Only what is genuinely public: published upcoming gigs, and profiles that
 * have been filled in. RLS already restricts the queries to exactly that set,
 * so nothing private can leak in here even if a filter is later removed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gigly-gilt.vercel.app";
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: gigs }, { data: entertainers }, { data: venues }] = await Promise.all([
    supabase
      .from("gigs")
      .select("id, updated_at")
      .eq("visibility", "published")
      .gte("date", today)
      .limit(1000),
    supabase.from("entertainer_profiles").select("id, updated_at").limit(1000),
    supabase.from("venue_profiles").select("id, updated_at").limit(1000),
  ]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/gigs`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.3 },
    ...(gigs ?? []).map((g) => ({
      url: `${base}/gigs/${g.id}`,
      lastModified: g.updated_at,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...(entertainers ?? []).map((e) => ({
      url: `${base}/entertainers/${e.id}`,
      lastModified: e.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...(venues ?? []).map((v) => ({
      url: `${base}/venues/${v.id}`,
      lastModified: v.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
