import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateSessionId } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const sessionId = await getOrCreateSessionId();

    const inspiration = await prisma.inspiration.findUnique({ where: { id } });
    if (!inspiration) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    try {
      await prisma.$transaction([
        prisma.inspirationInteraction.create({
          data: {
            inspirationId: id,
            sessionId,
            interactionType: "like",
          },
        }),
        prisma.inspiration.update({
          where: { id },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { success: false, error: "ALREADY_LIKED" },
          { status: 409 },
        );
      }
      throw error;
    }

    const updated = await prisma.inspiration.findUnique({ where: { id } });

    return NextResponse.json({
      success: true,
      likes_count: updated?.likesCount ?? inspiration.likesCount + 1,
    });
  } catch (error) {
    console.error("POST /api/inspirations/[id]/like error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
