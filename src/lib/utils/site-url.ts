import { headers } from "next/headers";

/**
 * Origin of the current request, for building auth redirect URLs.
 *
 * Derived from the request rather than hardcoded so the same code works on
 * localhost, on Vercel preview deployments (which get a fresh URL per pull
 * request) and in production — without a NEXT_PUBLIC_SITE_URL per environment.
 */
export async function siteUrl(path = "") {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  return `${protocol}://${host}${path}`;
}
