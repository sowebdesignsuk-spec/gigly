import type { Completeness } from "@/lib/profile/completeness";

/**
 * Profile completeness with prompts for what's missing — Section 5, Week 2.4.
 *
 * Shows the specific gaps and what each one costs the user. A bare percentage
 * tells someone they are failing without telling them at what.
 */
export function CompletenessMeter({ completeness }: { completeness: Completeness }) {
  const { score, missing } = completeness;
  const done = missing.length === 0;

  return (
    <section className="rounded-xl border border-ink-700 bg-ink-800 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-chalk">Profile strength</h2>
        <span className={`text-2xl font-bold ${done ? "text-go" : "text-hot-500"}`}>
          {score}%
        </span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-ink-600"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-go" : "bg-hot-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {done ? (
        <p className="mt-4 text-sm text-chalk-dim">
          Complete. Nothing else to add.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {missing.map((item) => (
            <li key={item.key} className="text-sm">
              <span className="font-medium text-chalk">{item.label}</span>
              <span className="mt-0.5 block text-xs text-chalk-faint">{item.why}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
