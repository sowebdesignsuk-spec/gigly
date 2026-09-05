import Link from "next/link";

import { Wordmark } from "@/components/layout/wordmark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="px-6 py-6">
        <Link href="/" className="inline-block">
          <Wordmark className="text-2xl" />
        </Link>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-6 pb-16">{children}</div>
    </main>
  );
}
