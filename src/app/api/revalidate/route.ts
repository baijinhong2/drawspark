import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * On-demand revalidation endpoint.
 *
 * POST /api/revalidate
 *   Headers: x-revalidate-secret: <REVALIDATE_SECRET>
 *   Body:    { "paths"?: string[] }  (optional, defaults to sitemap + inspirations)
 *
 * Used to force-refresh the sitemap after bulk DB operations that bypass
 * the normal /api/inspirations/generate flow (e.g. the reseed script).
 * Without this, the sitemap would only refresh on its 10-min ISR window
 * — which is fine most of the time but useless when you need to drop
 * hundreds of dead /i/{id} URLs from Google's crawl queue *now*.
 *
 * The secret is read from process.env.REVALIDATE_SECRET. If unset, the
 * endpoint refuses every request — fail-secure default for a route that
 * can trigger a global cache bust.
 */
export const runtime = "nodejs";

const DEFAULT_PATHS = ["/sitemap.xml"];
const DEFAULT_TAGS = ["inspirations"];

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return Response.json(
      { ok: false, error: "REVALIDATE_SECRET not configured" },
      { status: 503 },
    );
  }
  const provided = request.headers.get("x-revalidate-secret");
  if (provided !== expected) {
    return Response.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let paths: string[] = DEFAULT_PATHS;
  let tags: string[] = DEFAULT_TAGS;
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body.paths) && body.paths.every((p: unknown) => typeof p === "string")) {
      paths = body.paths;
    }
    if (Array.isArray(body.tags) && body.tags.every((t: unknown) => typeof t === "string")) {
      tags = body.tags;
    }
  } catch {
    // ignore — fall back to defaults
  }

  for (const p of paths) revalidatePath(p);
  for (const t of tags) revalidateTag(t);

  return Response.json({
    ok: true,
    revalidated: { paths, tags },
    at: new Date().toISOString(),
  });
}
