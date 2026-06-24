import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 10;

// Simple in-process rate limit (per-process, good enough for this scale)
const recentSends = new Map<string, number>();
const SEND_COOLDOWN_MS = 60_000;

function generateCode(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
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

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "PASSWORD_TOO_SHORT" },
        { status: 400 },
      );
    }

    // Derive displayName from email prefix
    const displayName = email.split("@")[0].slice(0, 30);

    // Rate limit
    const lastSent = recentSends.get(normalizedEmail) ?? 0;
    if (Date.now() - lastSent < SEND_COOLDOWN_MS) {
      return NextResponse.json(
        { success: false, error: "RATE_LIMITED" },
        { status: 429 },
      );
    }

    const prisma = getPrisma();

    // Check email not already taken
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "EMAIL_TAKEN" },
        { status: 409 },
      );
    }

    // Delete any old pending registration for this email
    await prisma.pendingRegistration.deleteMany({
      where: { email: normalizedEmail },
    });

    const code = generateCode();
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.pendingRegistration.create({
      data: {
        email: normalizedEmail,
        code,
        passwordHash,
        displayName,
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
      },
    });

    // Send email via Resend (lazy init to avoid build-time evaluation)
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "EMAIL_SEND_FAILED" },
        { status: 500 },
      );
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: "Drawspark <support@drawspark.art>",
      to: normalizedEmail,
      subject: `Your DrawSpark verification code: ${code}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Welcome to DrawSpark!</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This code expires in ${CODE_TTL_MINUTES} minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      // Clean up the pending registration on email failure
      await prisma.pendingRegistration.deleteMany({
        where: { email: normalizedEmail },
      });
      return NextResponse.json(
        { success: false, error: "EMAIL_SEND_FAILED" },
        { status: 500 },
      );
    }

    recentSends.set(normalizedEmail, Date.now());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/register/send-code error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
