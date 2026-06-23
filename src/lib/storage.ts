import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "drawspark";

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase admin client is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type UploadType = "avatars" | "comments" | "inspirations";

/**
 * Upload a file to Supabase Storage and return its public URL.
 * Path convention: `{type}/{userId|commentId}/{timestamp}.{ext}`
 */
export async function uploadImage(
  file: File,
  type: UploadType,
  ownerId: string,
): Promise<string> {
  const supabase = getAdminClient();
  const ext = inferExtension(file);
  const path = `${type}/${ownerId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type || "image/webp",
      upsert: false,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteImage(url: string): Promise<void> {
  // Best-effort delete. Extract path from the public URL.
  try {
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx < 0) return;
    const path = url.slice(idx + marker.length);
    const supabase = getAdminClient();
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (err) {
    console.error("deleteImage failed:", err);
  }
}

function inferExtension(file: File): string {
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/png") return "png";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/jpeg") return "jpg";
  // Fall back to extension from filename.
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "bin";
}