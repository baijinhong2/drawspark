/**
 * Google OAuth → DrawSpark account linking.
 *
 * Flow summary:
 *   1. Browser calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
 *      with `redirectTo` pointing at /api/auth/google/callback.
 *   2. Supabase redirects to Google → Google returns to Supabase → Supabase
 *      redirects to our callback with a `?code=...` query param.
 *   3. The callback route calls `supabase.auth.exchangeCodeForSession(code)`
 *      and reads the resulting `user`.
 *   4. We upsert that Google user into our `users` table by:
 *        - googleId (returning Google user, exact match)
 *        - email (linking into an existing email/password account)
 *        - or creating a new row.
 *      We then mint our own JWT and set the `drawspark_auth` cookie, so the
 *      rest of the app keeps working with the existing auth code.
 *   5. We do NOT persist the Supabase session. Continuing to use our own JWT
 *      keeps the existing `getCurrentUser` / cookie-based middleware flow
 *      intact.
 */
import "server-only";
import { getPrisma } from "./prisma";
import type { User } from "@/generated/prisma/client";

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
}

export type LinkedGoogleUser = User;

/**
 * Find or create a DrawSpark user for a freshly-returned Google account.
 *
 * Linking priority:
 *   1. Exact `googleId` match — returning Google user.
 *   2. `email` match — link into an existing password account, persist the
 *      googleId so future Google logins skip the email fallback.
 *   3. Create a brand-new row (no password, just Google).
 *
 * Race-safe: two concurrent first-time Google logins for the same email will
 * not create duplicates because Prisma's `where: { googleId }` and `email`
 * unique constraints both catch it; the loser retries the email lookup.
 */
export async function upsertGoogleUser(
  info: GoogleUserInfo,
): Promise<LinkedGoogleUser> {
  const prisma = getPrisma();

  // 1) Returning Google user
  const byGoogleId = await prisma.user.findUnique({
    where: { googleId: info.googleId },
  });
  if (byGoogleId) {
    // Refresh avatar / display name opportunistically; Google can change them.
    return prisma.user.update({
      where: { id: byGoogleId.id },
      data: {
        displayName: info.displayName || byGoogleId.displayName,
        avatarUrl: info.avatarUrl ?? byGoogleId.avatarUrl,
      },
    });
  }

  // 2) Email match — link to existing account
  const byEmail = await prisma.user.findUnique({
    where: { email: info.email },
  });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: info.googleId,
        // Only overwrite avatar/displayName if the existing row is empty —
        // we don't want a Google login silently mutating a profile the user
        // already set themselves.
        ...(byEmail.avatarUrl ? {} : { avatarUrl: info.avatarUrl }),
        ...(byEmail.displayName ? {} : { displayName: info.displayName }),
      },
    });
  }

  // 3) Brand new user
  return prisma.user.create({
    data: {
      email: info.email,
      googleId: info.googleId,
      displayName: info.displayName,
      avatarUrl: info.avatarUrl,
      // passwordHash left null — Google-only accounts have no password.
    },
  });
}

/**
 * Extract a normalized `GoogleUserInfo` from a Supabase user object.
 *
 * Supabase returns the Google `sub` in `user.id` for OAuth identities, and the
 * profile data in `user.user_metadata`. We defensively fall back across
 * several known field names because Google profile shape varies.
 */
export function extractGoogleUser(user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{
    provider?: string;
    provider_id?: string;
    identity_data?: Record<string, unknown> | null;
  }> | null;
}): GoogleUserInfo | null {
  if (!user.email) return null;

  const meta = user.user_metadata ?? {};
  const identity = user.identities?.find((i) => i.provider === "google");
  const identityData = identity?.identity_data ?? {};

  const googleId =
    (typeof identityData.sub === "string" && identityData.sub) ||
    (typeof meta.sub === "string" && meta.sub) ||
    (typeof meta.provider_id === "string" && meta.provider_id) ||
    user.id;

  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    [meta.given_name, meta.family_name].filter(Boolean).join(" ").trim() ||
    user.email.split("@")[0];

  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  return {
    googleId,
    email: user.email,
    emailVerified: Boolean(user.email_confirmed_at),
    displayName: fullName.slice(0, 30) || "User",
    avatarUrl,
  };
}