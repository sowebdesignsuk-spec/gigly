"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, FormMessage } from "@/components/ui/field";
import { requestPasswordResetAction, type AuthState } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full py-4 text-base">
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    requestPasswordResetAction,
    {},
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Reset your password</h1>
        <p className="text-sm text-chalk-dim">
          We&apos;ll email you a link to set a new one.
        </p>
      </div>

      {state.success ? (
        <FormMessage tone="success">{state.success}</FormMessage>
      ) : (
        <form action={formAction} className="space-y-5">
          {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}

          <Field htmlFor="email" label="Email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>

          <Submit />
        </form>
      )}

      <p className="text-sm text-chalk-faint">
        <Link href="/login" className="font-medium text-hot-500 hover:text-hot-400">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
