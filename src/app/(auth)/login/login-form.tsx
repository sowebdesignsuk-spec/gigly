"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, FormMessage } from "@/components/ui/field";
import { loginAction, type AuthState } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full py-4 text-base">
      {pending ? "Logging in…" : "Log in"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}

      <Field htmlFor="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field htmlFor="password" label="Password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Submit />

      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-chalk-dim hover:text-chalk">
          Forgotten your password?
        </Link>
      </p>
    </form>
  );
}
