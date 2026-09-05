"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AVATARS_BUCKET, publicImageUrl } from "@/lib/supabase/storage";
import { resizeImage } from "@/lib/utils/resize-image";

/**
 * Profile photo upload — Section 5, Week 2.2.
 *
 * Uploads straight from the browser to Supabase Storage. The storage RLS
 * policies (migration 20260905130000) restrict writes to a folder named after
 * the user's id, which is why userId is part of the path rather than trusted
 * input.
 */
export function AvatarUpload({
  userId,
  defaultPath,
}: {
  userId: string;
  defaultPath: string | null;
}) {
  const [path, setPath] = useState(defaultPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = publicImageUrl(AVATARS_BUCKET, path);

  async function upload(file: File) {
    setBusy(true);
    setError(null);

    try {
      const resized = await resizeImage(file, { maxWidth: 512, maxHeight: 512 });

      // Cache-busting name: overwriting a fixed filename leaves the old image
      // sitting in the CDN and the user thinks the upload silently failed.
      const objectPath = `${userId}/avatar-${Date.now()}.webp`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(objectPath, resized, { contentType: "image/webp", upsert: true });

      if (uploadError) throw uploadError;

      // Tidy up the previous one. Best-effort: a failure here costs a few KB,
      // and should not present as a failed upload.
      if (path) {
        await supabase.storage.from(AVATARS_BUCKET).remove([path]);
      }

      setPath(objectPath);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That upload didn't work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-ink-600 bg-ink-800">
        {preview ? (
          <Image src={preview} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-xs text-chalk-faint">
            No photo
          </span>
        )}
      </div>

      <div className="space-y-2">
        <input type="hidden" name="avatar_url" value={path ?? ""} />

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />

        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 text-xs"
        >
          {busy ? "Uploading…" : preview ? "Change photo" : "Upload photo"}
        </Button>

        {error ? (
          <p role="alert" className="text-xs text-stop">
            {error}
          </p>
        ) : (
          <p className="text-xs text-chalk-faint">JPG, PNG or WebP. Resized automatically.</p>
        )}
      </div>
    </div>
  );
}
