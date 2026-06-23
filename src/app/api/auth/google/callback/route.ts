import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { extractGoogleUser, upsertGoogleUser } from "@/lib/googleAuth";

const OAUTH_NEXT_COOKIE = "drawspark_oauth_next";

function sanitiseNext(raw: string | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw.length > 512 ? "/" : raw;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error_description");
  const oauthErrorCode = url.searchParams.get("error_code");

  const cookieStore = await cookies();
  const savedNext = sanitiseNext(cookieStore.get(OAUTH_NEXT_COOKIE)?.value);
  // Consume the cookie so it cannot be reused.
  cookieStore.delete(OAUTH_NEXT_COOKIE);

  /**
   * Surface OAuth failures to the UI by appending `?oauth_error=<code>` to the
   * redirect target. Without this the user sees a silent bounce back to the
   * page they came from and has no way to know what went wrong.
   */
  const withError = (path: string, code: string) => {
    const target = new URL(path, request.url);
    target.searchParams.set("oauth_error", code);
    return NextResponse.redirect(target);
  };

  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));

  if (oauthErrorCode || oauthError) {
    console.error(
      "[google/callback] Supabase rejected the OAuth response:",
      oauthErrorCode,
      oauthError,
    );
    return withError(savedNext, oauthErrorCode ?? "unknown");
  }

  if (!code) {
    console.error("[google/callback] missing ?code in callback URL");
    return withError(savedNext, "missing_code");
  }

  try {
    const supabase = getServerSupabase(cookieStore);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error(
        "[google/callback] exchangeCodeForSession failed:",
        error?.message ?? "no user returned",
      );
      return withError(savedNext, "exchange_failed");
    }

    const googleInfo = extractGoogleUser(data.user);
    if (!googleInfo) {
      console.error(
        "[google/callback] Google user has no email, refusing to link",
      );
      return withError(savedNext, "no_email");
    }

    const user = await upsertGoogleUser(googleInfo);

    const token = generateToken(user.id);
    await setAuthCookie(token);

    return redirect(savedNext);
  } catch (err) {
    console.error("[google/callback] unexpected error:", err);
    return withError(savedNext, "internal");
  }
}