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

    let alreadyCopied = false;

    try {
      await prisma.$transaction([
        prisma.inspirationInteraction.create({
          data: {
            inspirationId: id,
            sessionId,
            interactionType: "copy",
          },
        }),
        prisma.inspiration.update({
          where: { id },
          data: { copiesCount: { increment: 1 } },
        }),
      ]);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        alreadyCopied = true;
      } else {
        throw error;
      }
    }

    const updated = await prisma.inspiration.findUnique({ where: { id } });

    return NextResponse.json({
      success: true,
      copies_count: updated?.copiesCount ?? inspiration.copiesCount,
      already_copied: alreadyCopied,
      text: `${inspiration.title}\n\n${inspiration.description ?? ""}`,
    });
  } catch (error) {
    console.error("POST /api/inspirations/[id]/copy error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
