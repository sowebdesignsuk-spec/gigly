import Link from "next/link";

import Image from "next/image";

import { CategoryTiles } from "@/components/marketing/category-tiles";
import { HeroGigs, type HeroGig } from "@/components/marketing/hero-gigs";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { loadContent } from "@/lib/cms/content";
import { createClient } from "@/lib/supabase/server";
import { HERO_SHOT, stockUrl } from "@/lib/media/stock";

/**
 * The public homepage.
 *
 * Copy comes from the CMS (defaults in src/lib/cms/defaults.ts, overrides in
 * site_content). Every figure on the page is read from the database — a
 * marketplace homepage that claims numbers it doesn't have is the kind of lie
 * people remember, and each of these degrades to nothing when it is zero.
 */
export default async function HomePage() {
  const [t, supabase] = await Promise.all([loadContent("home"), createClient()]);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: heroGigs }, { count: actCount }, { data: allOpen }] = await Promise.all([
    supabase.rpc("search_gigs", { p_limit: 3 }),
    supabase
      .from("entertainer_profiles")
      .select("id", { count: "exact", head: true })
      .not("stage_name", "is", null),
    supabase
      .from("gigs")
      .select("category, location_text")
      .eq("visibility", "published")
      .gte("date", today)
      .limit(500),
  ]);

  const open = allOpen ?? [];
  const counts = open.reduce<Record<string, number>>((acc, g) => {
    acc[g.category] = (acc[g.category] ?? 0) + 1;
    return acc;
  }, {});
  const towns = new Set(open.map((g) => g.location_text)).size;

  const stats = [
    { value: open.length, label: "gigs open now" },
    { value: actCount ?? 0, label: "acts on GIGLY" },
    { value: towns, label: towns === 1 ? "town covered" : "towns covered" },
    { value: 0, label: "commission, ever", prefix: "£" },
  ].filter((s) => s.value > 0 || s.prefix);

  return (
    <div className="grain flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ------------------------------------------------------------ hero */}
        <section className="stage-wash relative">
          {/* A real stage, dimmed hard so the type stays the loudest thing on
              the page and the brand wash still reads over it. */}
          <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
            <Image
              src={stockUrl(HERO_SHOT.id, 1800, 900)}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/85 to-ink-900" />
          </div>

          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 pt-16 pb-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:pt-24 lg:pb-24">
            <div>
              <p className="rise text-xs font-semibold tracking-[0.2em] text-hot-400 uppercase">
                {t("home.hero.eyebrow")}
              </p>

              <h1
                className="rise mt-5 text-[2.75rem] leading-[0.98] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-[4.25rem]"
                style={{ animationDelay: "60ms" }}
              >
                {t("home.hero.title")}
              </h1>

              <p
                className="rise mt-6 max-w-xl text-lg leading-relaxed text-chalk-dim"
                style={{ animationDelay: "120ms" }}
              >
                {t("home.hero.body")}
              </p>

              <div
                className="rise mt-9 flex flex-col gap-3 sm:flex-row"
                style={{ animationDelay: "180ms" }}
              >
                <Link
                  href="/signup?type=entertainer"
                  className="rounded-xl bg-hot-500 px-7 py-4 text-center text-base font-semibold text-white shadow-[0_10px_40px_-14px] shadow-hot-500 transition-colors hover:bg-hot-400"
                >
                  {t("home.hero.cta_entertainer")}
                </Link>
                <Link
                  href="/signup?type=venue"
                  className="rounded-xl border border-ink-600 bg-ink-800/70 px-7 py-4 text-center text-base font-semibold text-chalk transition-colors hover:border-chalk-faint"
                >
                  {t("home.hero.cta_venue")}
                </Link>
              </div>

              {stats.length > 0 ? (
                <dl
                  className="rise mt-12 flex flex-wrap gap-x-10 gap-y-5 border-t border-ink-700 pt-7"
                  style={{ animationDelay: "240ms" }}
                >
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dt className="sr-only">{s.label}</dt>
                      <dd>
                        <span className="block text-2xl font-extrabold text-chalk tabular-nums">
                          {s.prefix}
                          {s.value}
                        </span>
                        <span className="mt-0.5 block text-xs tracking-wide text-chalk-faint uppercase">
                          {s.label}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>

            <div className="rise lg:pl-4" style={{ animationDelay: "300ms" }}>
              <HeroGigs gigs={(heroGigs ?? []) as HeroGig[]} />
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- browse by */}
        {open.length > 0 ? (
          <section className="border-y border-ink-700 bg-ink-850/60">
            <div className="mx-auto w-full max-w-6xl px-6 py-12">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-xl font-bold">Browse by act</h2>
                <Link href="/entertainers" className="text-sm font-semibold text-hot-500 hover:text-hot-400">
                  See every act →
                </Link>
              </div>
              <div className="mt-6">
                <CategoryTiles counts={counts} />
              </div>
            </div>
          </section>
        ) : null}

        {/* --------------------------------------------------- two audiences */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                key: "entertainers",
                title: t("home.entertainers.title"),
                body: t("home.entertainers.body"),
                points: [
                  t("home.entertainers.point_1"),
                  t("home.entertainers.point_2"),
                  t("home.entertainers.point_3"),
                ],
                cta: { href: "/signup?type=entertainer", label: "Create an entertainer profile" },
              },
              {
                key: "venues",
                title: t("home.venues.title"),
                body: t("home.venues.body"),
                points: [t("home.venues.point_1"), t("home.venues.point_2"), t("home.venues.point_3")],
                cta: { href: "/entertainers", label: "Browse acts near you" },
              },
            ].map((side) => (
              <div key={side.key} className="panel lit-edge flex flex-col p-8">
                <h2 className="text-2xl font-bold">{side.title}</h2>
                <p className="mt-3 leading-relaxed text-chalk-dim">{side.body}</p>

                <ul className="mt-7 flex-1 space-y-3.5">
                  {side.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm text-chalk">
                      <span
                        aria-hidden
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-hot-500"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={side.cta.href}
                  className="mt-8 inline-block text-sm font-semibold text-hot-500 transition-colors hover:text-hot-400"
                >
                  {side.cta.label} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------- how it works */}
        <section className="stage-wash-soft relative border-y border-ink-700 bg-ink-850/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 className="text-3xl font-bold tracking-tight">{t("home.how.title")}</h2>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {[1, 2, 3].map((n) => (
                <li key={n} className="relative">
                  {/* The rule doubles as the connector between steps on wide
                      screens; it is decoration only, so it is hidden from
                      assistive tech and the ordered list carries the sequence. */}
                  <div aria-hidden className="mb-6 flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-hot-500/40 bg-hot-500/10 text-sm font-bold text-hot-400 tabular-nums">
                      {n}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-ink-600 to-transparent" />
                  </div>

                  <h3 className="text-lg font-semibold text-chalk">
                    {t(`home.how.step_${n}_title` as "home.how.step_1_title")}
                  </h3>
                  <p className="mt-2.5 leading-relaxed text-chalk-dim">
                    {t(`home.how.step_${n}_body` as "home.how.step_1_body")}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --------------------------------------------------------------- cta */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="relative overflow-hidden rounded-2xl border border-hot-500/25 p-10 sm:p-16">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(40rem_20rem_at_20%_0%,color-mix(in_oklab,var(--color-hot-500)_22%,transparent),transparent_70%),radial-gradient(30rem_18rem_at_90%_100%,color-mix(in_oklab,var(--color-ultra)_20%,transparent),transparent_70%)]"
            />

            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
              {t("home.cta.title")}
            </h2>
            <p className="mt-4 max-w-xl text-lg text-chalk-dim">{t("home.cta.body")}</p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-xl bg-hot-500 px-7 py-4 text-center text-base font-semibold text-white shadow-[0_10px_40px_-14px] shadow-hot-500 transition-colors hover:bg-hot-400"
              >
                {t("home.cta.button")}
              </Link>
              <Link
                href="/gigs"
                className="rounded-xl border border-ink-600 bg-ink-900/50 px-7 py-4 text-center text-base font-semibold text-chalk transition-colors hover:border-chalk-faint"
              >
                Browse gigs first
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
