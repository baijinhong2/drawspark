import { NextResponse } from "next/server";
import { generateCaptcha } from "@/lib/captcha";

export async function POST() {
  try {
    const { captchaId, svg } = generateCaptcha();
    return NextResponse.json({ success: true, captchaId, svg });
  } catch (error) {
    console.error("POST /api/auth/captcha error:", error);
    return NextResponse.json(
      { success: false, error: "CAPTCHA_FAILED" },
      { status: 500 },
    );
  }
}