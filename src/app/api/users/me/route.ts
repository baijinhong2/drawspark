import { NextRequest, NextResponse } from "next/server";
import { requireUser, toAuthUser, AuthError } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: "UNAUTHORIZED" },
          { status: 401 },
        );
      }
      throw err;
    }

    const body = await request.json().catch(() => ({}));
    const data: { displayName?: string; avatarUrl?: string | null } = {};

    if (typeof body.displayName === "string") {
      const trimmed = body.displayName.trim();
      if (trimmed.length < 1 || trimmed.length > 30) {
        return NextResponse.json(
          { success: false, error: "DISPLAY_NAME_INVALID" },
          { status: 400 },
        );
      }
      data.displayName = trimmed;
    }

    if (body.avatarUrl === null) {
      data.avatarUrl = null;
    } else if (typeof body.avatarUrl === "string") {
      if (!/^https?:\/\//.test(body.avatarUrl)) {
        return NextResponse.json(
          { success: false, error: "AVATAR_URL_INVALID" },
          { status: 400 },
        );
      }
      data.avatarUrl = body.avatarUrl;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_CHANGES" },
        { status: 400 },
      );
    }

    const updated = await getPrisma().user.update({
      where: { id: user.id },
      data,
    });
    return NextResponse.json({ success: true, user: toAuthUser(updated) });
  } catch (error) {
    console.error("PUT /api/users/me error:", error);
    return NextResponse.json(
      { success: false, error: "UPDATE_FAILED" },
      { status: 500 },
    );
  }
}