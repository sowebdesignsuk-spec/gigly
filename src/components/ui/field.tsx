import type { ComponentProps, ReactNode } from "react";

const INPUT =
  "w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-sm " +
  "text-chalk placeholder:text-chalk-faint focus:border-hot-500 focus:outline-none";

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-chalk">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-chalk-faint">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={[INPUT, className].filter(Boolean).join(" ")} {...props} />;
}

/**
 * Form-level feedback. `role="alert"` so screen readers announce a failed
 * sign-in rather than leaving the user staring at an unchanged form.
 */
export function FormMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const styles =
    tone === "error"
      ? "border-stop/40 bg-stop/10 text-stop"
      : "border-go/40 bg-go/10 text-go";

  return (
    <p role="alert" className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}
