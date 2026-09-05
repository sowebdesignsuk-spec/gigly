import Link from "next/link";
import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { loadContent } from "@/lib/cms/content";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const t = await loadContent("about");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance">{t("about.title")}</h1>
        <div className="mt-8 space-y-5 text-lg leading-relaxed text-chalk-dim">
          {t("about.body")
            .split("\n\n")
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>

        <section className="mt-14 rounded-2xl border border-ink-700 bg-ink-800 p-8">
          <h2 className="text-xl font-bold">{t("about.pilot.title")}</h2>
          <p className="mt-3 leading-relaxed text-chalk-dim">{t("about.pilot.body")}</p>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
          >
            Sign up
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
