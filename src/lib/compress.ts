import imageCompression from "browser-image-compression";

export const COMPRESS_CONFIG = {
  avatars: { maxSizeMB: 0.2, maxWidthOrHeight: 400 },
  comments: { maxSizeMB: 0.5, maxWidthOrHeight: 1200 },
  inspirations: { maxSizeMB: 0.5, maxWidthOrHeight: 1200 },
} as const;

export type CompressType = keyof typeof COMPRESS_CONFIG;

/**
 * Compress an image on the client. Always re-encodes to WebP for predictable size.
 */
export async function compressImage(
  file: File,
  type: CompressType,
): Promise<File> {
  const cfg = COMPRESS_CONFIG[type];
  return imageCompression(file, {
    ...cfg,
    fileType: "image/webp",
    useWebWorker: true,
    initialQuality: 0.85,
  });
}