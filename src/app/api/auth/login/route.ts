import { NextRequest, NextResponse } from "next/server";
import {
  generateToken,
  setAuthCookie,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "EMAIL_INVALID" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    const token = generateToken(user.id);
    await setAuthCookie(token);

    return NextResponse.json({ success: true, user: toAuthUser(user) });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, error: "LOGIN_FAILED" },
      { status: 500 },
    );
  }
}
