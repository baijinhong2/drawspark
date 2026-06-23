import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "./prisma";

export interface SerializedComment {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  content: string;
  imageUrl: string | null;
  parentId: string | null;
  createdAt: string;
  replies: SerializedComment[];
}

type CommentRow = Prisma.CommentGetPayload<{
  include: {
    user: { select: { id: true; displayName: true; avatarUrl: true } };
  };
}>;

/**
 * Build a flat row list (createdAt asc) into a nested tree of
 * SerializedComment. Defensive: cycles or unknown parents fall back to
 * the root rather than throwing.
 */
export function buildCommentTree(rows: CommentRow[]): SerializedComment[] {
  const byId = new Map<string, SerializedComment>();
  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      userId: row.userId,
      user: row.user,
      content: row.content,
      imageUrl: row.imageUrl,
      parentId: row.parentId,
      createdAt: row.createdAt.toISOString(),
      replies: [],
    });
  }
  const roots: SerializedComment[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.replies.push(node);
    } else {
      // Orphan / top-level → root.
      roots.push(node);
    }
  }
  // Stable sort by createdAt asc.
  const sortByCreated = (a: SerializedComment, b: SerializedComment) =>
    a.createdAt.localeCompare(b.createdAt);
  const sortRecursive = (list: SerializedComment[]) => {
    list.sort(sortByCreated);
    for (const c of list) sortRecursive(c.replies);
  };
  sortRecursive(roots);
  return roots;
}

/**
 * Load comments for an inspiration, returns the pre-built tree.
 * Returns [] if the inspiration doesn't exist (caller decides whether to 404).
 */
export async function loadCommentTree(
  inspirationId: string,
): Promise<SerializedComment[]> {
  const prisma = getPrisma();
  const rows = await prisma.comment.findMany({
    where: { inspirationId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  return buildCommentTree(rows);
}