"use client";

import { useId, useState } from "react";

/**
 * Multi-select rendered as toggleable chips.
 *
 * Built on real checkboxes rather than divs with click handlers: the form posts
 * repeated `name` values with no JavaScript on the submit path, and keyboard and
 * screen-reader behaviour comes for free.
 */
export function ChipGroup({
  name,
  options,
  defaultValue = [],
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string[];
}) {
  const groupId = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultValue));

  function toggle(value: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const id = `${groupId}-${option.value}`;
        const isOn = selected.has(option.value);

        return (
          <label
            key={option.value}
            htmlFor={id}
            className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
              isOn
                ? "border-hot-500 bg-hot-500/15 text-chalk"
                : "border-ink-600 bg-ink-800 text-chalk-dim hover:border-ink-600 hover:text-chalk"
            }`}
          >
            <input
              id={id}
              type="checkbox"
              name={name}
              value={option.value}
              checked={isOn}
              onChange={(event) => toggle(option.value, event.target.checked)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
