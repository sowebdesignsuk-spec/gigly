import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GIGLY — More gigs. More money. More freedom.",
    template: "%s · GIGLY",
  },
  description:
    "GIGLY connects entertainers with venues. Find gigs, fill dates, get booked.",
  openGraph: {
    title: "GIGLY",
    description: "More gigs. More money. More freedom.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink-900 text-chalk">
        {children}
      </body>
    </html>
  );
}
