import { NextRequest, NextResponse } from "next/server";
import { generateToken, hashPassword, setAuthCookie, toAuthUser } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { getPrisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, displayName, captchaId, captchaCode } = body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof displayName !== "string" ||
      typeof captchaId !== "string" ||
      typeof captchaCode !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    if (!verifyCaptcha(captchaId, captchaCode)) {
      return NextResponse.json(
        { success: false, error: "CAPTCHA_INVALID" },
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

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "PASSWORD_TOO_SHORT" },
        { status: 400 },
      );
    }

    const trimmedName = displayName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 30) {
      return NextResponse.json(
        { success: false, error: "DISPLAY_NAME_INVALID" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "EMAIL_TAKEN" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: trimmedName,
      },
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