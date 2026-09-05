import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { loadContent } from "@/lib/cms/content";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const t = await loadContent("contact");
  const email = t("contact.email");

  return (
    <div className="grain flex flex-1 flex-col">
      <SiteHeader />
      <main className="stage-wash mx-auto w-full max-w-2xl flex-1 px-6 py-20">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">{t("contact.title")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-chalk-dim">{t("contact.body")}</p>

        <a
          href={`mailto:${email}`}
          className="mt-8 inline-block rounded-xl bg-hot-500 px-6 py-4 text-base font-semibold text-white hover:bg-hot-400"
        >
          {email}
        </a>

        <p className="mt-10 text-sm text-chalk-faint">
          Already signed up? Message venues and acts directly from their profiles — that&apos;s
          faster than emailing us.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
