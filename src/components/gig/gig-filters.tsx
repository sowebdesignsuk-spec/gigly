import { ENTERTAINER_CATEGORIES } from "@/lib/profile/constants";

export type GigFilterValues = {
  q?: string;
  category?: string;
  from?: string;
  to?: string;
  near?: string;
  radius?: string;
  min?: string;
};

/**
 * Gig filters — Section 5, Week 3.3.
 *
 * A plain GET form. Every filtered view therefore has its own URL, which means
 * the back button works, a search can be bookmarked or shared, and the whole
 * thing keeps working with JavaScript still loading.
 */
export function GigFilters({ values }: { values: GigFilterValues }) {
  const inputClass =
    "w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-chalk placeholder:text-chalk-faint focus:border-hot-500 focus:outline-none";
  const labelClass = "block text-xs font-medium text-chalk-dim";

  return (
    <form
      method="get"
      className="space-y-4 rounded-xl border border-ink-700 bg-ink-800 p-5"
      role="search"
    >
      <div className="space-y-1.5">
        <label htmlFor="q" className={labelClass}>
          Search
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={values.q ?? ""}
          placeholder="Band, venue name, town…"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="category" className={labelClass}>
            Type of act
          </label>
          <select
            id="category"
            name="category"
            defaultValue={values.category ?? ""}
            className={inputClass}
          >
            <option value="">Any</option>
            {ENTERTAINER_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="min" className={labelClass}>
            Pays at least
          </label>
          <input
            id="min"
            name="min"
            inputMode="decimal"
            defaultValue={values.min ?? ""}
            placeholder="£"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="near" className={labelClass}>
            Near
          </label>
          <input
            id="near"
            name="near"
            defaultValue={values.near ?? ""}
            placeholder="Town or postcode"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="radius" className={labelClass}>
            Within
          </label>
          <select
            id="radius"
            name="radius"
            defaultValue={values.radius ?? "30"}
            className={inputClass}
          >
            {[5, 10, 20, 30, 50, 100].map((miles) => (
              <option key={miles} value={miles}>
                {miles} miles
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="from" className={labelClass}>
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={values.from ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="to" className={labelClass}>
            Until
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={values.to ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-hot-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-hot-400"
        >
          Apply filters
        </button>
        <a
          href="/gigs"
          className="rounded-lg px-3 py-2.5 text-sm text-chalk-dim hover:text-chalk"
        >
          Clear
        </a>
      </div>
    </form>
  );
}
