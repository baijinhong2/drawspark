/**
 * Browser-side Supabase client.
 *
 * Used by the auth UI to trigger `signInWithOAuth({ provider: 'google' })`.
 * Supabase handles the redirect to Google and back to our `/api/auth/google/callback`.
 *
 * Public env vars only — no service role key.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase public env not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}