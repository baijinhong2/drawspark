import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireUser, AuthError } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

// POST /api/favorites { inspirationId } or ?inspirationId=... → add favorite
//
// Accepts the inspiration ID from either the request body (JSON) or the
// query string. The current client uses query (consistent with DELETE);
// older callers may use body.
export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch (err) {
      if (err instanceof AuthError) return unauth();
      throw err;
    }

    const fromQuery = request.nextUrl.searchParams.get("inspirationId");
    let inspirationId: string | null =
      typeof fromQuery === "string" && fromQuery.length > 0 ? fromQuery : null;

    if (!inspirationId) {
      const body = await request.json().catch(() => ({}));
      if (typeof body?.inspirationId === "string" && body.inspirationId.length > 0) {
        inspirationId = body.inspirationId;
      }
    }

    if (!inspirationId) {
      return NextResponse.json(
        { success: false, error: "INSPIRATION_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    // Verify inspiration exists.
    const ins = await prisma.inspiration.findUnique({
      where: { id: inspirationId },
      select: { id: true },
    });
    if (!ins) {
      return NextResponse.json(
        { success: false, error: "INSPIRATION_NOT_FOUND" },
        { status: 404 },
      );
    }

    try {
      await prisma.$transaction([
        prisma.favorite.create({
          data: { userId: user.id, inspirationId },
        }),
        prisma.inspiration.update({
          where: { id: inspirationId },
          data: { favoritesCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      // P2002 unique constraint — already favorited.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { success: false, error: "ALREADY_FAVORITED" },
          { status: 409 },
        );
      }
      throw err;
    }

    const updated = await prisma.inspiration.findUnique({
      where: { id: inspirationId },
      select: { favoritesCount: true },
    });

    return NextResponse.json({
      success: true,
      favorited: true,
      favoritesCount: updated?.favoritesCount ?? 0,
    });
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// DELETE /api/favorites?inspirationId=... → remove favorite
export async function DELETE(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch (err) {
      if (err instanceof AuthError) return unauth();
      throw err;
    }

    const inspirationId = request.nextUrl.searchParams.get("inspirationId");
    if (!inspirationId) {
      return NextResponse.json(
        { success: false, error: "INSPIRATION_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_inspirationId: {
          userId: user.id,
          inspirationId,
        },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "NOT_FAVORITED" },
        { status: 404 },
      );
    }

    await prisma.$transaction([
      prisma.favorite.delete({
        where: {
          userId_inspirationId: {
            userId: user.id,
            inspirationId,
          },
        },
      }),
      prisma.inspiration.update({
        where: { id: inspirationId },
        data: { favoritesCount: { decrement: 1 } },
      }),
    ]);

    const updated = await prisma.inspiration.findUnique({
      where: { id: inspirationId },
      select: { favoritesCount: true },
    });

    return NextResponse.json({
      success: true,
      favorited: false,
      favoritesCount: updated?.favoritesCount ?? 0,
    });
  } catch (error) {
    console.error("DELETE /api/favorites error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

function unauth() {
  return NextResponse.json(
    { success: false, error: "UNAUTHORIZED" },
    { status: 401 },
  );
}