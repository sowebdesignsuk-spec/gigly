"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { HOME_FOR } from "@/lib/supabase/session";
import { siteUrl } from "@/lib/utils/site-url";
import { loadSettings } from "@/lib/settings/load";
import type { AccountType } from "@/lib/types/database";

export type AuthState = {
  error?: string;
  success?: string;
};

const ACCOUNT_TYPES: AccountType[] = ["entertainer", "venue"];

/** Section 5, Week 1.6 — sign-up for both account types. */
export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const accountType = String(formData.get("account_type") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Registration can be closed from /admin/settings. Checked here rather than
  // only hiding the form, because hiding a form is not closing a door.
  const settings = await loadSettings();
  if (!settings.bool("marketplace.signups_open")) {
    return { error: "New sign-ups are closed at the moment. Check back soon." };
  }

  // account_type is immutable once set (Section 4.1), and it arrives from a
  // hidden field, so it is validated rather than trusted.
  if (!ACCOUNT_TYPES.includes(accountType as AccountType)) {
    return { error: "Pick whether you're an entertainer or a venue." };
  }
  if (fullName.length < 2) {
    return { error: "Enter your name." };
  }
  if (password.length < 8) {
    return { error: "Passwords need to be at least 8 characters." };
  }

  const supabase = await createClient();

  // options.data becomes raw_user_meta_data, which the handle_new_user trigger
  // reads to build the profiles row. See migration 20260905120100_profiles.sql.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { account_type: accountType, full_name: fullName },
      emailRedirectTo: await siteUrl("/auth/callback"),
    },
  });

  if (error) {
    return { error: error.message };
  }

  // With email confirmation switched on, signUp returns a user but no session.
  if (!data.session) {
    return {
      success: `Check ${email} for a confirmation link to finish setting up your account.`,
    };
  }

  redirect(HOME_FOR[accountType as AccountType]);
}

/** Section 5, Week 1.7 — login. */
export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately not distinguishing "no such account" from "wrong password".
    // Either message tells an attacker which emails are registered.
    return { error: "That email and password don't match an account." };
  }

  // Only follow `next` if it is a path on this site. An open redirect here
  // would let a phishing link bounce off gigly's own domain.
  if (next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }

  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase.from("profiles").select("account_type").eq("id", data.user.id).single(),
    supabase.from("profile_private").select("role").eq("user_id", data.user.id).maybeSingle(),
  ]);

  if (priv?.role === "admin") redirect("/admin");
  redirect(profile ? HOME_FOR[profile.account_type] : "/");
}

/** Section 5, Week 1.7 — password reset request. */
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await siteUrl("/auth/callback?next=/reset-password"),
  });

  // Always the same response, whether or not the address is registered — same
  // account-enumeration reasoning as the login error above.
  return {
    success: `If ${email} has an account, a reset link is on its way.`,
  };
}

/** Completes the reset, once the user is back with a valid recovery session. */
export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "Passwords need to be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Those two passwords don't match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  redirect(profile ? HOME_FOR[profile.account_type] : "/");
}

/** Section 5, Week 1.7 — logout. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
