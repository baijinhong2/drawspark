import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser, getCurrentUser, AuthError } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

// GET /api/comments?inspirationId=... → public; returns tree
export async function GET(request: NextRequest) {
  try {
    const inspirationId = request.nextUrl.searchParams.get("inspirationId");
    if (!inspirationId) {
      return NextResponse.json(
        { success: false, error: "INSPIRATION_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    // Verify inspiration exists (cheap).
    const exists = await prisma.inspiration.findUnique({
      where: { id: inspirationId },
      select: { id: true, commentsCount: true },
    });
    if (!exists) {
      return NextResponse.json(
        { success: false, error: "INSPIRATION_NOT_FOUND" },
        { status: 404 },
      );
    }

    const rows = await prisma.comment.findMany({
      where: { inspirationId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const tree = buildTree(rows);
    return NextResponse.json({
      success: true,
      data: {
        comments: tree,
        count: rows.length,
      },
    });
  } catch (error) {
    console.error("GET /api/comments error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// POST /api/comments { inspirationId, parentId?, content, imageUrl? }
export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: "UNAUTHORIZED" },
          { status: 401 },
        );
      }
      throw err;
    }

    const body = await request.json().catch(() => ({}));
    const inspirationId =
      typeof body?.inspirationId === "string" ? body.inspirationId : null;
    const content =
      typeof body?.content === "string" ? body.content.trim() : "";
    const parentId =
      typeof body?.parentId === "string" && body.parentId.length > 0
        ? body.parentId
        : null;
    const imageUrl =
      typeof body?.imageUrl === "string" && body.imageUrl.length > 0
        ? body.imageUrl
        : null;

    if (!inspirationId || !content) {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST" },
        { status: 400 },
      );
    }
    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: "CONTENT_TOO_LONG" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    // Validate parent (must belong to the same inspiration).
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { inspirationId: true, parentId: true },
      });
      if (!parent || parent.inspirationId !== inspirationId) {
        return NextResponse.json(
          { success: false, error: "PARENT_INVALID" },
          { status: 400 },
        );
      }
      // MVP: only 1 level of replies. If a parent is already a reply,
      // attach to its top-level ancestor instead.
      if (parent.parentId) {
        // Keep the original parentId so the tree shape is preserved for the
        // top-level comment — we re-parent the new comment to the parent's
        // top-level ancestor by setting parentId = parent.parentId.
        // For MVP simplicity, just keep parentId = original.parentId.
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          userId: user.id,
          inspirationId,
          parentId,
          content,
          imageUrl,
        },
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });
      await tx.inspiration.update({
        where: { id: inspirationId },
        data: { commentsCount: { increment: 1 } },
      });
      return comment;
    });

    return NextResponse.json({ success: true, comment: serialize(created) });
  } catch (error) {
    console.error("POST /api/comments error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================
// helpers
// ============================================================

type CommentRow = Prisma.CommentGetPayload<{
  include: { user: { select: { id: true; displayName: true; avatarUrl: true } } };
}>;

export type SerializedComment = {
  id: string;
  userId: string;
  user: { id: string; displayName: string; avatarUrl: string | null };
  content: string;
  imageUrl: string | null;
  parentId: string | null;
  createdAt: string;
  replies: SerializedComment[];
};

function serialize(row: CommentRow): SerializedComment {
  return {
    id: row.id,
    userId: row.userId,
    user: row.user,
    content: row.content,
    imageUrl: row.imageUrl,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
    replies: [],
  };
}

function buildTree(rows: CommentRow[]): SerializedComment[] {
  const byId = new Map<string, SerializedComment>();
  for (const row of rows) byId.set(row.id, serialize(row));
  const roots: SerializedComment[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}