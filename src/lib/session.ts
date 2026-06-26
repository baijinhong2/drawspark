import { cookies } from "next/headers";
import { DAILY_GENERATION_LIMIT, SESSION_COOKIE_NAME } from "./constants";
import { prisma } from "./prisma";

function generateSessionId(): string {
  return crypto.randomUUID();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (existing) {
    return existing;
  }

  const sessionId = generateSessionId();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return sessionId;
}

/**
 * Read-only session lookup for Server Components / pages, where writing a
 * cookie would throw ("Cookies can only be modified in a Server Action or
 * Route Handler"). Returns the existing sessionId, or null if the visitor
 * hasn't generated anything yet — the route handler will mint a cookie on
 * their first POST to /api/inspirations/generate.
 */
export async function readSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Check the daily generation limit and atomically increment the counter.
 *
 * - Logged-in users: pass `userId`, counter is keyed by user → 30/day total
 *   across all devices / browsers for that account.
 * - Anonymous visitors: pass `sessionId`, counter is keyed by the cookie.
 *
 * Exactly one of the two should be set; the function throws if both are
 * missing (it would have nowhere to record the generation).
 */
export async function checkAndIncrementGeneration(
  sessionId: string | null,
  userId: string | null,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!userId && !sessionId) {
    throw new Error(
      "checkAndIncrementGeneration requires either userId or sessionId",
    );
  }

  // Logged-in users get priority — the limit follows the account, not the
  // cookie. Falling back to sessionId keeps the existing anonymous flow.
  const lookupKey = userId ? { userId } : { sessionId: sessionId! };

  const now = new Date();

  let session = await prisma.userSession.findUnique({
    where: lookupKey,
  });

  if (!session) {
    session = await prisma.userSession.create({
      data: {
        ...(userId ? { userId } : { sessionId: sessionId! }),
        generatedCount: 0,
      },
    });
  }

  if (
    session.lastGeneratedAt &&
    !isSameDay(session.lastGeneratedAt, now)
  ) {
    session = await prisma.userSession.update({
      where: lookupKey,
      data: { generatedCount: 0 },
    });
  }

  if (session.generatedCount >= DAILY_GENERATION_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  const updated = await prisma.userSession.update({
    where: lookupKey,
    data: {
      generatedCount: { increment: 1 },
      lastGeneratedAt: now,
    },
  });

  return {
    allowed: true,
    remaining: DAILY_GENERATION_LIMIT - updated.generatedCount,
  };
}

export async function getRemainingGenerations(
  sessionId: string | null,
  userId: string | null,
): Promise<number> {
  if (!userId && !sessionId) return DAILY_GENERATION_LIMIT;

  const lookupKey = userId ? { userId } : { sessionId: sessionId! };
  const now = new Date();
  const session = await prisma.userSession.findUnique({
    where: lookupKey,
  });

  if (!session) {
    return DAILY_GENERATION_LIMIT;
  }

  if (
    session.lastGeneratedAt &&
    !isSameDay(session.lastGeneratedAt, now)
  ) {
    return DAILY_GENERATION_LIMIT;
  }

  return Math.max(0, DAILY_GENERATION_LIMIT - session.generatedCount);
}
