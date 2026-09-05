"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { VENUE_PHOTOS_BUCKET, publicImageUrl } from "@/lib/supabase/storage";
import { resizeImage } from "@/lib/utils/resize-image";

const MAX_PHOTOS = 8;

/**
 * Venue photo gallery — Section 5, Week 2.6.
 *
 * Paths are posted as a single comma-separated hidden field. Storage paths are
 * generated here and never contain a comma, so the round trip is safe.
 */
export function PhotoGalleryUpload({
  userId,
  defaultPaths,
}: {
  userId: string;
  defaultPaths: string[];
}) {
  const [paths, setPaths] = useState<string[]>(defaultPaths);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const room = MAX_PHOTOS - paths.length;

  async function upload(files: FileList) {
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const uploaded: string[] = [];

    try {
      for (const file of Array.from(files).slice(0, room)) {
        // Wider than an avatar — these are room shots, shown at card width.
        const resized = await resizeImage(file, { maxWidth: 1600, maxHeight: 1200 });
        const objectPath = `${userId}/venue-${Date.now()}-${uploaded.length}.webp`;

        const { error: uploadError } = await supabase.storage
          .from(VENUE_PHOTOS_BUCKET)
          .upload(objectPath, resized, { contentType: "image/webp" });

        if (uploadError) throw uploadError;
        uploaded.push(objectPath);
      }

      setPaths((current) => [...current, ...uploaded]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That upload didn't work.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    setPaths((current) => current.filter((p) => p !== path));
    // Removing from storage too, so deleted photos don't quietly count toward
    // the 1GB free tier forever.
    await createClient().storage.from(VENUE_PHOTOS_BUCKET).remove([path]);
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="venue_photos" value={paths.join(",")} />

      {paths.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {paths.map((path) => (
            <li
              key={path}
              className="group relative aspect-4/3 overflow-hidden rounded-xl border border-ink-600 bg-ink-900"
            >
              <Image
                src={publicImageUrl(VENUE_PHOTOS_BUCKET, path)!}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 220px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => void remove(path)}
                className="absolute top-2 right-2 rounded-full bg-ink-950/80 px-2.5 py-1 text-xs font-medium text-chalk opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) void upload(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy || room <= 0}
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 text-xs"
        >
          {busy ? "Uploading…" : paths.length > 0 ? "Add more" : "Add photos"}
        </Button>

        {error ? (
          <p role="alert" className="text-xs text-stop">
            {error}
          </p>
        ) : (
          <p className="text-xs text-chalk-faint">
            {room > 0
              ? `Up to ${MAX_PHOTOS} photos. Show the stage and the room.`
              : `That's the maximum of ${MAX_PHOTOS}.`}
          </p>
        )}
      </div>
    </div>
  );
}
