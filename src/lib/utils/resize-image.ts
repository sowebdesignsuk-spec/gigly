/**
 * Client-side image downscale — Section 5, Week 2.2.
 *
 * Entertainers upload straight from a phone, where a photo is routinely 4–8MB.
 * Resizing in the browser keeps uploads fast on venue wifi and keeps the
 * Supabase free tier's 1GB storage from filling up on images nobody will ever
 * view at full size.
 */

export type ResizeOptions = {
  maxWidth: number;
  maxHeight: number;
  /** 0–1. 0.85 is visually lossless for photographs at these sizes. */
  quality?: number;
};

export async function resizeImage(
  file: File,
  { maxWidth, maxHeight, quality = 0.85 }: ResizeOptions,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not read that image.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    // WebP is ~30% smaller than JPEG at the same quality and is supported by
    // every browser Next.js 16 targets.
    canvas.toBlob(resolve, "image/webp", quality),
  );

  if (!blob) throw new Error("Could not process that image.");

  return blob;
}
