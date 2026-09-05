import Link from "next/link";
import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { loadContent } from "@/lib/cms/content";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const t = await loadContent("pricing");

  return (
    <div className="grain flex flex-1 flex-col">
      <SiteHeader />
      <main className="stage-wash mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">{t("pricing.title")}</h1>
        <p className="mt-4 text-lg text-chalk-dim">{t("pricing.body")}</p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-hot-500/40 bg-hot-500/10 p-7">
            <p className="text-xs font-semibold tracking-widest text-hot-400 uppercase">Now</p>
            <h2 className="mt-2 text-3xl font-extrabold">{t("pricing.free.title")}</h2>
            <p className="mt-3 leading-relaxed text-chalk-dim">{t("pricing.free.body")}</p>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
            >
              Get started
            </Link>
          </section>

          <section className="rounded-2xl border border-ink-700 bg-ink-800 p-7">
            <p className="text-xs font-semibold tracking-widest text-chalk-faint uppercase">Coming</p>
            <h2 className="mt-2 text-3xl font-extrabold text-chalk-dim">{t("pricing.later.title")}</h2>
            <p className="mt-3 leading-relaxed text-chalk-dim">{t("pricing.later.body")}</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
