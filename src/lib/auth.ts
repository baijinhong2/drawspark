import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { User } from "@/generated/prisma/client";
import { getPrisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;
const AUTH_COOKIE_NAME = "drawspark_auth";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

if (!JWT_SECRET) {
  // Fail fast in dev if misconfigured; in production this would also throw on first call.
  // Use a guard rather than crashing at import time so build can succeed without env.
  console.warn(
    "[auth] JWT_SECRET is not set — authentication will not work until it is configured.",
  );
}

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

// ============= Password =============

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============= Token =============

export function generateToken(userId: string): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(
    { sub: userId },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL_SECONDS },
  );
}

export function verifyToken(token: string): { userId: string } | null {
  if (!JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string };
    if (typeof decoded.sub !== "string") return null;
    return { userId: decoded.sub };
  } catch {
    return null;
  }
}

// ============= Cookie =============

export async function setAuthCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_TTL_SECONDS,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
}

async function readAuthCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_COOKIE_NAME)?.value ?? null;
}

// ============= Current user =============

/**
 * Returns the authenticated user, or null if not signed in.
 * Safe to call from server components, route handlers, and server actions.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await readAuthCookie();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return loadAuthUser(payload.userId);
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required");
  }
  return user;
}

export async function loadAuthUser(userId: string): Promise<AuthUser | null> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
  return user ?? null;
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// Sanitize a User row from Prisma for client response (no password hash).
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}