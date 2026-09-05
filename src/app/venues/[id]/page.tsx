import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { ReviewsList, loadReviews } from "@/components/profile/reviews-list";
import { createClient } from "@/lib/supabase/server";
import { VENUE_PHOTOS_BUCKET, publicImageUrl } from "@/lib/supabase/storage";
import { ENTERTAINER_CATEGORIES, VENUE_TYPES } from "@/lib/profile/constants";

type Params = { params: Promise<{ id: string }> };

const VENUE_TYPE_LABEL = new Map(VENUE_TYPES.map((v) => [v.value as string, v.label]));
const CATEGORY_LABEL = new Map(ENTERTAINER_CATEGORIES.map((c) => [c.value as string, c.label]));

async function loadVenue(id: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("venue_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const venue = await loadVenue(id);

  if (!venue) return { title: "Not found" };

  const description =
    venue.description?.slice(0, 155)
    ?? `${VENUE_TYPE_LABEL.get(venue.venue_type) ?? "Venue"} in ${venue.city} booking live entertainment on GIGLY.`;

  return {
    title: venue.venue_name,
    description,
    openGraph: { title: `${venue.venue_name} · GIGLY`, description },
  };
}

export default async function VenuePublicProfile({ params }: Params) {
  const { id } = await params;
  const venue = await loadVenue(id);

  if (!venue) notFound();

  const photos = venue.venue_photos ?? [];
  const reviews = await loadReviews(venue.user_id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type":
      venue.venue_type === "hotel"
        ? "Hotel"
        : venue.venue_type === "restaurant"
          ? "Restaurant"
          : "EntertainmentBusiness",
    name: venue.venue_name,
    description: venue.description ?? undefined,
    url: venue.website_url ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: [venue.address_line_1, venue.address_line_2].filter(Boolean).join(", "),
      addressLocality: venue.city,
      postalCode: venue.postcode,
      addressCountry: "GB",
    },
    ...(reviews.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviews.average?.toFixed(1),
            reviewCount: reviews.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <main className="grain flex flex-1 flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{venue.venue_name}</h1>
          <p className="text-sm text-chalk-dim">
            {VENUE_TYPE_LABEL.get(venue.venue_type) ?? "Venue"} · {venue.city}, {venue.postcode}
            {reviews.count > 0
              ? ` · ${reviews.average?.toFixed(1)} ★ from ${reviews.count} act${reviews.count === 1 ? "" : "s"}`
              : ""}
          </p>
          {venue.website_url ? (
            <a
              href={venue.website_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-block text-sm text-hot-500 hover:text-hot-400"
            >
              Visit website
            </a>
          ) : null}
        </div>

        {photos.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((path) => (
              <li
                key={path}
                className="relative aspect-4/3 overflow-hidden rounded-xl border border-ink-700 bg-ink-800"
              >
                <Image
                  src={publicImageUrl(VENUE_PHOTOS_BUCKET, path)!}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 220px"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}

        {venue.description ? (
          <section className="mt-10 space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
              About the venue
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-chalk-dim">
              {venue.description}
            </p>
          </section>
        ) : null}

        {venue.entertainment_preferences.length > 0 ? (
          <section className="mt-10 space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
              Usually books
            </h2>
            <p className="text-sm text-chalk-dim">
              {venue.entertainment_preferences
                .map((c) => CATEGORY_LABEL.get(c) ?? c)
                .join(" · ")}
            </p>
          </section>
        ) : null}

        <section className="mt-10 space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-chalk-faint uppercase">
            Where
          </h2>
          <address className="text-sm not-italic text-chalk-dim">
            {venue.address_line_1}
            {venue.address_line_2 ? <>, {venue.address_line_2}</> : null}
            <br />
            {venue.city}
            <br />
            {venue.postcode}
          </address>
        </section>

        <ReviewsList reviews={reviews} of={venue.venue_name} />

        <div className="mt-12 rounded-xl border border-ink-700 bg-ink-800 p-6">
          <p className="font-semibold text-chalk">Play here</p>
          <p className="mt-1 text-sm text-chalk-dim">
            {venue.total_gigs_posted > 0
              ? `${venue.venue_name} has posted ${venue.total_gigs_posted} gig${venue.total_gigs_posted === 1 ? "" : "s"} on GIGLY.`
              : `${venue.venue_name} hasn't posted a gig yet.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/messages/new?to=${venue.user_id}`}
              className="rounded-xl bg-hot-500 px-5 py-3 text-sm font-semibold text-white hover:bg-hot-400"
            >
              Message {venue.venue_name}
            </Link>
            <Link
              href="/gigs"
              className="rounded-xl bg-ink-700 px-5 py-3 text-sm font-semibold text-chalk hover:bg-ink-600"
            >
              Browse open gigs
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
