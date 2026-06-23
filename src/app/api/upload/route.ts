import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth";
import { uploadImage, type UploadType } from "@/lib/storage";

const ALLOWED_TYPES: UploadType[] = ["avatars", "comments", "inspirations"];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB hard cap after client compression
const ALLOWED_MIME = new Set([
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
]);

export async function POST(request: NextRequest) {
  try {
    try {
      await requireUser();
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: "UNAUTHORIZED" },
          { status: 401 },
        );
      }
      throw err;
    }

    const form = await request.formData();
    const file = form.get("file");
    const type = form.get("type");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "FILE_MISSING" },
        { status: 400 },
      );
    }
    if (typeof type !== "string" || !ALLOWED_TYPES.includes(type as UploadType)) {
      return NextResponse.json(
        { success: false, error: "TYPE_INVALID" },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "MIME_INVALID" },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: "FILE_TOO_LARGE" },
        { status: 400 },
      );
    }

    const user = await requireUser();
    const url = await uploadImage(file, type as UploadType, user.id);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { success: false, error: "UPLOAD_FAILED" },
      { status: 500 },
    );
  }
}