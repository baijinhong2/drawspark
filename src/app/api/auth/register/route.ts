import { NextRequest, NextResponse } from "next/server";
import { generateToken, setAuthCookie, toAuthUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const CODE_RE = /^\d{6}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, code } = body ?? {};

    if (typeof email !== "string" || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    if (!CODE_RE.test(code)) {
      return NextResponse.json(
        { success: false, error: "CODE_INVALID" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const prisma = getPrisma();

    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending) {
      return NextResponse.json(
        { success: false, error: "CODE_NOT_FOUND" },
        { status: 400 },
      );
    }

    if (pending.expiresAt < new Date()) {
      await prisma.pendingRegistration.deleteMany({
        where: { email: normalizedEmail },
      });
      return NextResponse.json(
        { success: false, error: "CODE_EXPIRED" },
        { status: 400 },
      );
    }

    if (pending.code !== code) {
      return NextResponse.json(
        { success: false, error: "CODE_WRONG" },
        { status: 400 },
      );
    }

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: pending.passwordHash,
        displayName: pending.displayName,
      },
    });

    // Clean up pending registration
    await prisma.pendingRegistration.deleteMany({
      where: { email: normalizedEmail },
    });

    const token = generateToken(user.id);
    await setAuthCookie(token);

    return NextResponse.json({ success: true, user: toAuthUser(user) });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      { success: false, error: "REGISTER_FAILED" },
      { status: 500 },
    );
  }
}
