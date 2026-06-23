import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serializeInspiration } from "@/lib/inspiration";
import { getPrisma } from "@/lib/prisma";

// GET /api/users/me/inspirations — my inspirations (created by me)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const items = await getPrisma().inspiration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        inspirations: items.map((i) => serializeInspiration(i)),
      },
    });
  } catch (error) {
    console.error("GET /api/users/me/inspirations error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}