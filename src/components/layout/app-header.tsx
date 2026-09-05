import Link from "next/link";

import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";

export function AppHeader({ name }: { name: string }) {
  return (
    <header className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
      <Link href="/">
        <Wordmark className="text-xl" />
      </Link>

      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-chalk-dim sm:inline">{name}</span>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
