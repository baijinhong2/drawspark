import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serializeInspiration } from "@/lib/inspiration";
import { getPrisma } from "@/lib/prisma";

// GET /api/users/me/favorites — inspirations I've favorited
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const favs = await getPrisma().favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { inspiration: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        favorites: favs.map((f) => ({
          favoritedAt: f.createdAt.toISOString(),
          inspiration: serializeInspiration(f.inspiration, {
            favorited: true,
          }),
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/users/me/favorites error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}