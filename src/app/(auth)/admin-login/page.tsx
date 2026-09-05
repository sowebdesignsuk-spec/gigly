import type { Metadata } from "next";

import { LoginForm } from "../login/login-form";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

/**
 * Admin sign-in. Same auth system as everyone else — a second one would be a
 * second thing to secure — but a separate door, so admin accounts never go
 * through the customer flow. Anyone without the admin role who signs in here
 * is simply sent to their own dashboard.
 */
export default function AdminLoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-hold/15 px-2.5 py-0.5 text-xs font-semibold text-hold">
          Admin
        </span>
        <h1 className="text-3xl font-bold">GIGLY admin</h1>
        <p className="text-sm text-chalk-dim">Staff only. Customers sign in at the normal login.</p>
      </div>

      <LoginForm next="/admin" />
    </div>
  );
}
