import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import type { TimeEstimate } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import {
  AUDIENCES,
  DIFFICULTIES,
  MOODS,
  SCENES,
  STYLES,
  SUBJECTS,
  TIME_ESTIMATES,
} from "@/lib/constants";
import { toTimeEstimate } from "@/lib/enums";
import { isValidFilter } from "@/lib/enums";
import { serializeInspiration } from "@/lib/inspiration";
import { prisma } from "@/lib/prisma";
import { inferSearchIntent } from "@/lib/searchIntent";

type SearchSource = "keyword" | "llm_intent" | "none";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const sort = searchParams.get("sort") || "latest";
    const q = searchParams.get("q")?.trim();

    // Base where from explicit filter params (subject/style/difficulty/...).
    // This is shared across keyword search, LLM fallback, and no-search paths.
    const baseWhere: Prisma.InspirationWhereInput = { status: "published" };

    const subjects = parseMulti(searchParams, "subject", SUBJECTS);
    if (subjects) baseWhere.subject = { in: subjects };

    const styles = parseMulti(searchParams, "style", STYLES);
    if (styles) baseWhere.style = { in: styles };

    const difficulties = parseMulti(searchParams, "difficulty", DIFFICULTIES);
    if (difficulties) baseWhere.difficulty = { in: difficulties };

    const moods = parseMulti(searchParams, "mood", MOODS);
    if (moods) baseWhere.mood = { in: moods };

    const scenes = parseMulti(searchParams, "scene", SCENES);
    if (scenes) baseWhere.scene = { in: scenes };

    const audiences = parseMulti(searchParams, "audience", AUDIENCES);
    if (audiences) baseWhere.audience = { in: audiences };

    const timeEstimates = parseTimeEstimates(searchParams);
    if (timeEstimates) baseWhere.timeEstimate = { in: timeEstimates };

    const orderBy: Prisma.InspirationOrderByWithRelationInput =
      sort === "likes"
        ? { likesCount: "desc" }
        : sort === "copies"
          ? { copiesCount: "desc" }
          : sort === "favorites"
            ? { favoritesCount: "desc" }
            : { createdAt: "desc" };

    // Resolve the actual data + total via the two-stage search below.
    const { items, total, source } = await resolveItems({
      baseWhere,
      q,
      orderBy,
      page,
      limit,
    });

    const currentUser = await getCurrentUser();
    let favoriteIds = new Set<string>();
    if (currentUser && items.length > 0) {
      const favs = await prisma.favorite.findMany({
        where: {
          userId: currentUser.id,
          inspirationId: { in: items.map((i) => i.id) },
        },
        select: { inspirationId: true },
      });
      favoriteIds = new Set(favs.map((f) => f.inspirationId));
    }

    return NextResponse.json({
      success: true,
      data: {
        inspirations: items.map((item) =>
          serializeInspiration(item, {
            favorited: favoriteIds.has(item.id),
          }),
        ),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        source,
      },
    });
  } catch (error) {
    console.error("GET /api/inspirations error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * Two-stage resolver:
 *   1. If `q` is empty, just run the base where.
 *   2. Otherwise try a keyword ILIKE on title/description first.
 *   3. If keyword misses, ask the LLM to translate `q` into structured
 *      filters (subject/style/difficulty/mood/scene/audience/time_estimate)
 *      and re-query with those.
 *   4. If both miss, return an empty list with `source: "none"`.
 */
async function resolveItems({
  baseWhere,
  q,
  orderBy,
  page,
  limit,
}: {
  baseWhere: Prisma.InspirationWhereInput;
  q: string | undefined;
  orderBy: Prisma.InspirationOrderByWithRelationInput;
  page: number;
  limit: number;
}): Promise<{
  items: Awaited<ReturnType<typeof prisma.inspiration.findMany>>;
  total: number;
  source: SearchSource;
}> {
  const skip = (page - 1) * limit;

  // No free-text query → straight to the base filter.
  if (!q) {
    const r = await runQuery(baseWhere, orderBy, skip, limit);
    return { ...r, source: "none" };
  }

  // Stage 1: keyword match on title + description.
  const keywordWhere: Prisma.InspirationWhereInput = {
    ...baseWhere,
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ],
  };
  const kw = await runQuery(keywordWhere, orderBy, skip, limit);
  if (kw.items.length > 0) {
    return { ...kw, source: "keyword" };
  }

  // Stage 2: ask the LLM to translate the query into 1-3 English keywords,
  // then OR-search title/description for any of them.
  const intent = await inferSearchIntent(q);
  const queries = intent.queries;
  if (!queries || queries.length === 0) {
    return { items: [], total: 0, source: "none" };
  }

  const llmWhere: Prisma.InspirationWhereInput = {
    ...baseWhere,
    OR: queries.flatMap((kw) => [
      { title: { contains: kw, mode: "insensitive" } },
      { description: { contains: kw, mode: "insensitive" } },
    ]),
  };

  const llm = await runQuery(llmWhere, orderBy, skip, limit);
  return { ...llm, source: "llm_intent" };
}

async function runQuery(
  where: Prisma.InspirationWhereInput,
  orderBy: Prisma.InspirationOrderByWithRelationInput,
  skip: number,
  take: number,
) {
  const [items, total] = await Promise.all([
    prisma.inspiration.findMany({ where, orderBy, skip, take }),
    prisma.inspiration.count({ where }),
  ]);
  return { items, total };
}

/**
 * Parse repeated query params (?k=a&k=b) AND comma-separated values (?k=a,b)
 * into a deduplicated list of valid enum values.
 */
function parseMulti<T extends string>(
  params: URLSearchParams,
  key: string,
  options: readonly T[],
): T[] | undefined {
  const raw = params.getAll(key);
  if (raw.length === 0) return undefined;

  const collected: T[] = [];
  const seen = new Set<T>();
  for (const value of raw) {
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (
        trimmed &&
        isValidFilter(trimmed, options) &&
        !seen.has(trimmed as T)
      ) {
        seen.add(trimmed as T);
        collected.push(trimmed as T);
      }
    }
  }
  return collected.length > 0 ? collected : undefined;
}

/** Same as parseMulti but converts short time keys into Prisma enum values. */
function parseTimeEstimates(
  params: URLSearchParams,
): TimeEstimate[] | undefined {
  const raw = params.getAll("time_estimate");
  if (raw.length === 0) return undefined;

  const collected: TimeEstimate[] = [];
  const seen = new Set<TimeEstimate>();
  for (const value of raw) {
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (
        trimmed &&
        isValidFilter(trimmed, TIME_ESTIMATES) &&
        !seen.has(toTimeEstimate(trimmed))
      ) {
        const converted = toTimeEstimate(trimmed);
        seen.add(converted);
        collected.push(converted);
      }
    }
  }
  return collected.length > 0 ? collected : undefined;
}