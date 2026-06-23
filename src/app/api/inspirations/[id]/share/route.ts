import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/inspirations/[id]/share
 *
 * Bumps `sharesCount`. Public — no auth required, no per-session dedup.
 * Every share click counts as one share (matches user expectation that
 * "I clicked share, count went up by 1"). Returns the authoritative
 * `shares_count` so the client can reconcile.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const inspiration = await prisma.inspiration.findUnique({
      where: { id },
      select: { id: true, sharesCount: true },
    });
    if (!inspiration) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const updated = await prisma.inspiration.update({
      where: { id },
      data: { sharesCount: { increment: 1 } },
      select: { sharesCount: true },
    });

    return NextResponse.json({
      success: true,
      shares_count: updated.sharesCount,
    });
  } catch (error) {
    console.error("POST /api/inspirations/[id]/share error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}