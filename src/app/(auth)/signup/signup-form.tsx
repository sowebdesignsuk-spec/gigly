"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, FormMessage } from "@/components/ui/field";
import { signUpAction, type AuthState } from "../actions";
import type { AccountType } from "@/lib/types/database";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full py-4 text-base">
      {pending ? "Creating account…" : label}
    </Button>
  );
}

export function SignUpForm({ accountType }: { accountType: AccountType }) {
  const [state, formAction] = useActionState<AuthState, FormData>(signUpAction, {});

  if (state.success) {
    return <FormMessage tone="success">{state.success}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="account_type" value={accountType} />

      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}

      <Field
        htmlFor="full_name"
        label={accountType === "venue" ? "Your name" : "Your name"}
        hint={
          accountType === "venue"
            ? "The person managing the account. You'll add the venue name next."
            : "Your real name. You'll add your stage name next."
        }
      >
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          required
          minLength={2}
        />
      </Field>

      <Field htmlFor="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field htmlFor="password" label="Password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>

      <Submit label="Create account" />
    </form>
  );
}
