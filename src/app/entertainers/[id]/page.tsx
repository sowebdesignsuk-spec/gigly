import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Wordmark } from "@/components/layout/wordmark";
import { createClient } from "@/lib/supabase/server";
import { AVATARS_BUCKET, publicImageUrl } from "@/lib/supabase/storage";
import {
  ENTERTAINER_CATEGORIES,
  EVENT_TYPES,
  MEDIA_PLATFORMS,
  formatPence,
} from "@/lib/profile/constants";

type Params = { params: Promise<{ id: string }> };

const CATEGORY_LABEL = new Map(ENTERTAINER_CATEGORIES.map((c) => [c.value as string, c.label]));
const EVENT_LABEL = new Map(EVENT_TYPES.map((e) => [e.value as string, e.label]));
const PLATFORM_LABEL = new Map(MEDIA_PLATFORMS.map((p) => [p.value as string, p.label]));

/**
 * Reads through public_profiles rather than profiles: this page is public, and
 * the profiles table holds email and phone. See the RLS migration.
 */
async function loadEntertainer(id: string) {
  const supabase = await createClient();

  const { data: entertainer } = await supabase
    .from("entertainer_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!entertainer) return null;

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("full_name, avatar_url, location_text")
    .eq("id", entertainer.user_id)
    .maybeSingle();

  return profile ? { entertainer, profile } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const data = await loadEntertainer(id);

  if (!data) return { title: "Not found" };

  const { entertainer, profile } = data;
  const categories = entertainer.categories
    .map((c) => CATEGORY_LABEL.get(c) ?? c)
    .join(", ");

  const description = entertainer.bio?.slice(0, 155)
    ?? `${categories}${profile.location_text ? ` based in ${profile.location_text}` : ""}. Available to book on GIGLY.`;

  return {
    title: entertainer.stage_name,
    description,
    openGraph: {
      title: `${entertainer.stage_name} · GIGLY`,
      description,
      images: publicImageUrl(AVATARS_BUCKET, profile.avatar_url)
        ? [publicImageUrl(AVATARS_BUCKET, profile.avatar_url)!]
        : undefined,
    },
  };
}

export default async function EntertainerPublicProfile({ params }: Params) {
  const { id } = await params;
  const data = await loadEntertainer(id);

  if (!data) notFound();

  const { entertainer, profile } = data;
  const avatar = publicImageUrl(AVATARS_BUCKET, profile.avatar_url);
  const media = Array.isArray(entertainer.media_links) ? entertainer.media_links : [];

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-ink-700 px-6 py-5">
        <Link href="/">
          <Wordmark className="text-xl" />
        </Link>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full border border-ink-600 bg-ink-800">
            {avatar ? (
              <Image src={avatar} alt="" fill sizes="96px" className="object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-xs text-chalk-faint">
                No photo
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{entertainer.stage_name}</h1>
            <p className="text-sm text-chalk-dim">
              {entertainer.categories.map((c) => CATEGORY_LABEL.get(c) ?? c).join(" · ")}
              {profile.location_text ? ` — ${profile.location_text}` : ""}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-chalk-dim">
              {entertainer.starting_price ? (
                <span>
                  <span className="font-semibold text-chalk">
                    From {formatPence(entertainer.starting_price)}
                  </span>
                </span>
              ) : null}
              <span>Travels up to {entertainer.travel_radius_miles} miles</span>
              {entertainer.average_rating ? (
                <span>
                  {Number(entertainer.average_rating).toFixed(1)} ★ over{" "}
                  {entertainer.total_bookings} bookings
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {entertainer.bio ? (
          <section className="mt-10 space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
              About
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-chalk-dim">
              {entertainer.bio}
            </p>
          </section>
        ) : null}

        {media.length > 0 ? (
          <section className="mt-10 space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
              Listen and watch
            </h2>
            <ul className="flex flex-wrap gap-3">
              {media.map((link) => {
                const entry = link as { type?: string; url?: string };
                if (!entry.url) return null;

                return (
                  <li key={entry.url}>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-block rounded-full border border-ink-600 bg-ink-800 px-4 py-2 text-sm text-chalk hover:border-hot-500"
                    >
                      {PLATFORM_LABEL.get(entry.type ?? "") ?? "Link"}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {entertainer.event_types.length > 0 ? (
          <section className="mt-10 space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
              Plays
            </h2>
            <p className="text-sm text-chalk-dim">
              {entertainer.event_types.map((e) => EVENT_LABEL.get(e) ?? e).join(" · ")}
            </p>
          </section>
        ) : null}

        <div className="mt-12 rounded-xl border border-ink-700 bg-ink-800 p-6">
          <p className="font-semibold text-chalk">Want to book {entertainer.stage_name}?</p>
          <p className="mt-1 text-sm text-chalk-dim">
            Post a gig and they can apply, or message them directly. Direct
            enquiries arrive in Week 6.
          </p>
          <Link
            href="/signup?type=venue"
            className="mt-4 inline-block rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
          >
            Post a gig
          </Link>
        </div>
      </div>
    </main>
  );
}
