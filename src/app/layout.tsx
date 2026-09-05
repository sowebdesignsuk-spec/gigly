import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Script from "next/script";

import "./globals.css";

import { loadSettings } from "@/lib/settings/load";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

/** Site-wide metadata, driven by /admin/settings. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();

  const name = settings.get("site.name");
  const title = settings.get("seo.default_title");
  const description = settings.get("seo.default_description");
  const ogImage = settings.get("seo.og_image");
  const google = settings.get("seo.google_site_verification");
  const bing = settings.get("seo.bing_site_verification");

  return {
    metadataBase: new URL(settings.get("site.url")),
    title: { default: title, template: `%s · ${name}` },
    description,
    openGraph: {
      title: name,
      description,
      type: "website",
      images: ogImage ? [ogImage] : undefined,
    },
    // The noindex switch is enforced in robots.ts too; this covers crawlers
    // that read the meta tag but not robots.txt.
    robots: settings.bool("seo.noindex") ? { index: false, follow: false } : undefined,
    verification: {
      ...(google ? { google } : {}),
      ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await loadSettings();
  const plausible = settings.get("analytics.plausible_domain");
  const ga = settings.get("analytics.ga_measurement_id");

  return (
    <html lang="en-GB" className={`${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink-900 text-chalk">
        {children}

        {/* Nothing loads unless it has been configured in /admin/settings —
            an analytics script nobody asked for is a cookie banner nobody
            wanted. */}
        {plausible ? (
          <Script
            defer
            data-domain={plausible}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}

        {ga ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
