"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, FormMessage } from "@/components/ui/field";
import { updatePasswordAction, type AuthState } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full py-4 text-base">
      {pending ? "Saving…" : "Set new password"}
    </Button>
  );
}

/**
 * Reached from the emailed reset link, after /auth/callback has exchanged the
 * code for a recovery session. Landing here without that session means
 * updateUser fails, which is the correct outcome.
 */
export default function ResetPasswordPage() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    {},
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Choose a new password</h1>
      </div>

      <form action={formAction} className="space-y-5">
        {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}

        <Field htmlFor="password" label="New password" hint="At least 8 characters.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>

        <Field htmlFor="confirm_password" label="Confirm new password">
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>

        <Submit />
      </form>
    </div>
  );
}
