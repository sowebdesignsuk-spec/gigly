import Link from "next/link";

import { Wordmark } from "@/components/layout/wordmark";
import { loadContent } from "@/lib/cms/content";

export async function SiteFooter() {
  const t = await loadContent("footer");

  return (
    <footer className="border-t border-ink-700">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-chalk-faint">
        <div className="flex items-center gap-3">
          <Wordmark className="text-base" />
          <span>{t("footer.tagline")}</span>
        </div>
        <ul className="flex flex-wrap gap-5">
          <li><Link href="/gigs" className="hover:text-chalk">Find gigs</Link></li>
          <li><Link href="/about" className="hover:text-chalk">About</Link></li>
          <li><Link href="/pricing" className="hover:text-chalk">Pricing</Link></li>
          <li><Link href="/contact" className="hover:text-chalk">Contact</Link></li>
          <li><Link href="/signup" className="hover:text-chalk">Sign up</Link></li>
        </ul>
      </div>
    </footer>
  );
}
