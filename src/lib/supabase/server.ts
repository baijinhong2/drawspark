/**
 * Server-side Supabase clients.
 *
 * Two flavors:
 * - `getServerSupabase(cookieStore)` — anon-key client bound to the request's
 *   cookies, used to call `auth.exchangeCodeForSession(code)` on the OAuth
 *   callback. Supabase uses the SSR cookies to track the PKCE flow.
 * - `getAdminSupabase()` — service-role client for privileged operations
 *   (admin user lookups, etc). Never expose this to the browser.
 */
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { cookies as nextCookies } from "next/headers";

type CookieStore = Awaited<ReturnType<typeof nextCookies>>;

export function getServerSupabase(cookieStore: CookieStore): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase public env not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component (read-only). The middleware / route
          // handler that wrote the cookie already persists it; safe to ignore.
        }
      },
    },
  });
}

export function getAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin env not set (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}