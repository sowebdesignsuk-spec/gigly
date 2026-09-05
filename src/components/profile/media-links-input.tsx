"use client";

import { useState } from "react";

import { Input } from "@/components/ui/field";
import { MEDIA_PLATFORMS, type MediaLink } from "@/lib/profile/constants";

/**
 * Media links — Section 5, Week 2.3.
 *
 * One field per platform rather than a repeatable "add another link" list: an
 * act has at most one YouTube channel and one Spotify page, and the fixed shape
 * makes the stored jsonb predictable for the public profile to render.
 *
 * Serialised into a single hidden field because FormData has no nested-object
 * representation and the column is jsonb.
 */
export function MediaLinksInput({ defaultValue = [] }: { defaultValue?: MediaLink[] }) {
  const [links, setLinks] = useState<Record<string, string>>(() =>
    Object.fromEntries(defaultValue.map((link) => [link.type, link.url])),
  );

  const serialised = JSON.stringify(
    MEDIA_PLATFORMS.filter((platform) => links[platform.value]?.trim()).map((platform) => ({
      type: platform.value,
      url: links[platform.value].trim(),
    })),
  );

  return (
    <div className="space-y-4">
      <input type="hidden" name="media_links" value={serialised} />

      {MEDIA_PLATFORMS.map((platform) => (
        <div key={platform.value} className="space-y-2">
          <label
            htmlFor={`media-${platform.value}`}
            className="block text-sm font-medium text-chalk-dim"
          >
            {platform.label}
          </label>
          <Input
            id={`media-${platform.value}`}
            type="url"
            inputMode="url"
            placeholder={platform.placeholder}
            value={links[platform.value] ?? ""}
            onChange={(event) =>
              setLinks((current) => ({ ...current, [platform.value]: event.target.value }))
            }
          />
        </div>
      ))}
    </div>
  );
}
