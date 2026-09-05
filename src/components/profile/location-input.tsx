"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/field";
import type { ResolvedLocation } from "@/lib/utils/postcode";

/**
 * Town or postcode lookup — Section 5, Week 2.9.
 *
 * Posts three fields: location_text for display and location_lat/location_lng
 * for the PostGIS distance search in Week 3. The coordinates only ever come
 * from a chosen suggestion, never from free text, so a half-typed town cannot
 * end up stored with no coordinates.
 */
export function LocationInput({
  defaultText = "",
  defaultLat,
  defaultLng,
}: {
  defaultText?: string;
  defaultLat?: number | null;
  defaultLng?: number | null;
}) {
  const listId = useId();
  const [query, setQuery] = useState(defaultText);
  const [results, setResults] = useState<ResolvedLocation[]>([]);
  const [chosen, setChosen] = useState<ResolvedLocation | null>(
    defaultText && defaultLat != null && defaultLng != null
      ? { text: defaultText, lat: defaultLat, lng: defaultLng }
      : null,
  );
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced lookup. Skipped entirely once a suggestion is chosen, otherwise
  // selecting "Manchester" immediately fires a search for "Manchester".
  useEffect(() => {
    if (chosen?.text === query) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/locations?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const body = (await response.json()) as { results: ResolvedLocation[] };
        setResults(body.results);
        setOpen(true);
      } catch {
        // Aborted or offline — leave the previous suggestions in place.
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, chosen]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function choose(location: ResolvedLocation) {
    setChosen(location);
    setQuery(location.text);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        id="location"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setChosen(null);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Town or postcode, e.g. Manchester or M1 1AE"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
      />

      <input type="hidden" name="location_text" value={chosen?.text ?? ""} />
      <input type="hidden" name="location_lat" value={chosen?.lat ?? ""} />
      <input type="hidden" name="location_lng" value={chosen?.lng ?? ""} />

      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-ink-600 bg-ink-800 shadow-xl"
        >
          {results.map((result) => (
            <li key={`${result.lat},${result.lng}`}>
              <button
                type="button"
                role="option"
                aria-selected={chosen?.text === result.text}
                onClick={() => choose(result)}
                className="block w-full px-4 py-3 text-left text-sm text-chalk hover:bg-ink-700"
              >
                {result.text}
                {result.postcode ? (
                  <span className="ml-2 text-xs text-chalk-faint">{result.postcode}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-xs text-chalk-faint">
        {chosen
          ? "Location set."
          : searching
            ? "Searching…"
            : "Start typing, then pick from the list so we can match you on distance."}
      </p>
    </div>
  );
}
