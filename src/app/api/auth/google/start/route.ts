import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Save the path the user was on when they tapped "Continue with Google", so
 * the OAuth callback can return them there after a successful login.
 *
 * The cookie is short-lived (10 min) and consumed once by the callback route.
 *
 * Input is sanitised to a same-origin absolute path to defeat open-redirect
 * attacks via crafted `next` values.
 */
const OAUTH_NEXT_COOKIE = "drawspark_oauth_next";

function sanitiseNext(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  // Cap length so a malicious client cannot blow up the cookie.
  return raw.length > 512 ? "/" : raw;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const next = sanitiseNext((body as { next?: unknown })?.next);

    const cookieStore = await cookies();
    cookieStore.set(OAUTH_NEXT_COOKIE, next, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/google/start error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}