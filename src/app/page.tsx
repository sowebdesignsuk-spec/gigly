import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Wordmark } from "@/components/layout/wordmark";
import { loadContent } from "@/lib/cms/content";
import { createClient } from "@/lib/supabase/server";

/**
 * The public homepage.
 *
 * Copy comes from the CMS (defaults in src/lib/cms/defaults.ts, overrides in
 * site_content). The live gig count is the one dynamic thing on the page and
 * is deliberately real — a marketplace homepage that says "hundreds of gigs"
 * over an empty database is the kind of lie people remember.
 */
export default async function HomePage() {
  const [t, supabase] = await Promise.all([loadContent("home"), createClient()]);

  const today = new Date().toISOString().slice(0, 10);
  const { count: openGigs } = await supabase
    .from("gigs")
    .select("id", { count: "exact", head: true })
    .eq("visibility", "published")
    .gte("date", today);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* ---------------------------------------------------------- hero */}
        <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-14 sm:pt-24 sm:pb-20">
          <p className="text-xs font-semibold tracking-widest text-chalk-faint uppercase">
            {t("home.hero.eyebrow")}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
            {t("home.hero.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-chalk-dim">{t("home.hero.body")}</p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup?type=entertainer"
              className="rounded-xl bg-hot-500 px-6 py-4 text-center text-base font-semibold text-white hover:bg-hot-400"
            >
              {t("home.hero.cta_entertainer")}
            </Link>
            <Link
              href="/signup?type=venue"
              className="rounded-xl bg-ink-700 px-6 py-4 text-center text-base font-semibold text-chalk hover:bg-ink-600"
            >
              {t("home.hero.cta_venue")}
            </Link>
          </div>

          {openGigs ? (
            <p className="mt-8 text-sm text-chalk-faint">
              <Link href="/gigs" className="text-hot-500 hover:text-hot-400">
                {openGigs} gig{openGigs === 1 ? "" : "s"} open right now
              </Link>{" "}
              — browse without an account.
            </p>
          ) : null}
        </section>

        {/* ------------------------------------------------ two audiences */}
        <section className="border-y border-ink-700 bg-ink-800/40">
          <div className="mx-auto grid w-full max-w-5xl gap-px px-6 py-14 md:grid-cols-2 md:gap-12">
            <div>
              <h2 className="text-2xl font-bold">{t("home.entertainers.title")}</h2>
              <p className="mt-3 text-chalk-dim">{t("home.entertainers.body")}</p>
              <ul className="mt-6 space-y-3">
                {[t("home.entertainers.point_1"), t("home.entertainers.point_2"), t("home.entertainers.point_3")].map(
                  (p) => (
                    <li key={p} className="flex gap-3 text-sm text-chalk">
                      <span className="mt-0.5 text-hot-500">—</span>
                      <span>{p}</span>
                    </li>
                  ),
                )}
              </ul>
              <Link
                href="/signup?type=entertainer"
                className="mt-6 inline-block text-sm font-semibold text-hot-500 hover:text-hot-400"
              >
                Create an entertainer profile →
              </Link>
            </div>

            <div className="mt-12 md:mt-0">
              <h2 className="text-2xl font-bold">{t("home.venues.title")}</h2>
              <p className="mt-3 text-chalk-dim">{t("home.venues.body")}</p>
              <ul className="mt-6 space-y-3">
                {[t("home.venues.point_1"), t("home.venues.point_2"), t("home.venues.point_3")].map((p) => (
                  <li key={p} className="flex gap-3 text-sm text-chalk">
                    <span className="mt-0.5 text-hot-500">—</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?type=venue"
                className="mt-6 inline-block text-sm font-semibold text-hot-500 hover:text-hot-400"
              >
                Post your first gig →
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- how it works */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold">{t("home.how.title")}</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="relative border-t border-ink-700 pt-5">
                <span className="text-xs font-bold tracking-widest text-hot-500">0{n}</span>
                <h3 className="mt-2 font-semibold text-chalk">
                  {t(`home.how.step_${n}_title` as "home.how.step_1_title")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-chalk-dim">
                  {t(`home.how.step_${n}_body` as "home.how.step_1_body")}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------------------- cta */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-20">
          <div className="rounded-2xl border border-hot-500/30 bg-hot-500/10 p-8 sm:p-12">
            <Wordmark className="text-3xl" />
            <h2 className="mt-4 text-2xl font-bold">{t("home.cta.title")}</h2>
            <p className="mt-2 max-w-xl text-chalk-dim">{t("home.cta.body")}</p>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-xl bg-hot-500 px-6 py-4 text-base font-semibold text-white hover:bg-hot-400"
            >
              {t("home.cta.button")}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
