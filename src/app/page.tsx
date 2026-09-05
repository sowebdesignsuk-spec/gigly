import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/wordmark";

/**
 * Splash / welcome page — Section 5, Week 1.4.
 *
 * Deliberately a Server Component with no data fetching: this is the page that
 * gets shared, indexed and hit cold, so it should render as static HTML.
 */
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <Wordmark className="text-6xl sm:text-7xl" />

        <p className="mt-6 text-lg font-medium text-chalk-dim">
          More gigs. More money. More freedom.
        </p>

        <p className="mt-4 text-sm leading-relaxed text-chalk-faint">
          The marketplace where entertainers find work and venues find acts.
          Post a gig, apply in seconds, get booked — without the phone tag.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <ButtonLink href="/signup" className="w-full py-4 text-base">
            Get started
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" className="w-full py-4 text-base">
            Log in
          </ButtonLink>
        </div>
      </div>

      <footer className="border-t border-ink-700 px-6 py-6 text-center text-xs text-chalk-faint">
        <Wordmark className="text-sm" /> · Built for entertainers and the venues
        that book them
      </footer>
    </main>
  );
}
