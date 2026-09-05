import Link from "next/link";

import { Wordmark } from "@/components/layout/wordmark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="stage-wash grain flex flex-1 flex-col">
      <header className="px-6 py-6">
        <Link href="/" className="inline-block">
          <Wordmark className="text-2xl" />
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-20">
        {children}
      </div>
    </main>
  );
}
