import type { Inspiration } from "@/generated/prisma/client";
import { fromTimeEstimate } from "./enums";
import type { InspirationResponse } from "./types";

/**
 * Fields needed to build an InspirationResponse. Using `Pick` keeps
 * `serializeInspiration` callable from rows with `select` projections
 * (Prisma `findUnique` with `select` returns a subset of the full model).
 */
type InspirationLike = Pick<
  Inspiration,
  | "id"
  | "title"
  | "description"
  | "subject"
  | "style"
  | "difficulty"
  | "mood"
  | "scene"
  | "timeEstimate"
  | "audience"
  | "tags"
  | "likesCount"
  | "copiesCount"
  | "sharesCount"
  | "favoritesCount"
  | "commentsCount"
  | "createdAt"
>;

export function serializeInspiration(
  inspiration: InspirationLike,
  options: { favorited?: boolean } = {},
): InspirationResponse {
  return {
    id: inspiration.id,
    title: inspiration.title,
    description: inspiration.description,
    subject: inspiration.subject,
    style: inspiration.style,
    difficulty: inspiration.difficulty,
    mood: inspiration.mood,
    scene: inspiration.scene,
    time_estimate: fromTimeEstimate(inspiration.timeEstimate),
    audience: inspiration.audience,
    tags: Array.isArray(inspiration.tags)
      ? (inspiration.tags as string[])
      : [],
    likes_count: inspiration.likesCount,
    copies_count: inspiration.copiesCount,
    shares_count: inspiration.sharesCount,
    favorites_count: inspiration.favoritesCount,
    comments_count: inspiration.commentsCount,
    favorited: !!options.favorited,
    // `createdAt` may be a Date (direct Prisma call) or an ISO string
    // (when the row passed through unstable_cache / Next.js data cache).
    // Be defensive so serializeInspiration works in both paths.
    created_at:
      inspiration.createdAt instanceof Date
        ? inspiration.createdAt.toISOString()
        : new Date(inspiration.createdAt).toISOString(),
  };
}

export function truncateDescription(text: string, maxLength = 80): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}