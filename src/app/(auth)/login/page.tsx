import Link from "next/link";
import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-sm text-chalk-dim">Log in to your GIGLY account.</p>
      </div>

      <LoginForm next={next} />

      <p className="text-sm text-chalk-faint">
        New here?{" "}
        <Link href="/signup" className="font-medium text-hot-500 hover:text-hot-400">
          Create an account
        </Link>
      </p>
    </div>
  );
}
