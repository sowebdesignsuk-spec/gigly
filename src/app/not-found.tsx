import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/wordmark";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Wordmark className="text-3xl" />
      <h1 className="mt-6 text-2xl font-bold">That page isn&apos;t here</h1>
      <p className="mt-2 text-sm text-chalk-dim">
        The gig may have been taken down, or the link is wrong.
      </p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/gigs">Find gigs</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
