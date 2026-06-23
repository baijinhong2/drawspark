import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { streamInspirations } from "@/lib/deepseek";
import {
  toAudience,
  toDifficulty,
  toMood,
  toScene,
  toStyle,
  toSubject,
  toTimeEstimate,
} from "@/lib/enums";
import { serializeInspiration } from "@/lib/inspiration";
import { prisma } from "@/lib/prisma";
import {
  checkAndIncrementGeneration,
  getOrCreateSessionId,
} from "@/lib/session";

// Node runtime — required by Prisma + pg adapter.
export const runtime = "nodejs";
// Never cache the streaming response.
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Disable proxy buffering (nginx) so events flush immediately.
  "X-Accel-Buffering": "no",
};

function ssePayload(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  // ---- Pre-flight checks (return JSON; these happen before streaming) ----

  // Resolve the identity BEFORE the limit check so logged-in users are
  // counted against their account total (across devices), not just their
  // current browser cookie.
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id ?? null;
  const sessionId = userId ? null : await getOrCreateSessionId();

  const { allowed, remaining } = await checkAndIncrementGeneration(
    sessionId,
    userId,
  );

  if (!allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "DAILY_LIMIT_REACHED",
        message:
          "You have reached the daily limit of 30 generations. Please try again tomorrow.",
        remaining: 0,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const rawInput =
    typeof body.userInput === "string" ? body.userInput.trim() : undefined;
  if (rawInput && rawInput.length > 500) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "INPUT_TOO_LONG",
        message: "userInput must be 500 characters or fewer.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  const userInput = rawInput;

  // Optional structured tags (e.g. from a quick-tag click). Translates to a
  // natural-language prompt fragment so DeepSeek still sees a single string.
  type QuickTags = {
    style?: string;
    difficulty?: string;
    scene?: string;
    subject?: string;
  };
  const tags: QuickTags | undefined =
    body.tags && typeof body.tags === "object" ? (body.tags as QuickTags) : undefined;
  const validStyles = new Set([
    "cute",
    "cool",
    "simple",
    "realistic",
    "cartoon",
    "abstract",
    "vintage",
    "dark",
    "aesthetic",
    "doodle",
    "sketch",
    "kawaii",
    "graffiti",
    "minimalist",
    "trippy",
    "other",
  ]);
  const validDifficulties = new Set(["beginner", "easy", "medium", "hard"]);
  const validScenes = new Set([
    "bored",
    "class",
    "sketchbook",
    "gift",
    "holiday",
    "summer",
    "winter",
    "fall",
    "spring",
    "daily",
    "other",
  ]);
  const validSubjects = new Set([
    "animal",
    "people",
    "landscape",
    "still_life",
    "abstract",
    "fantasy",
    "food",
    "architecture",
    "nature",
    "holiday",
    "everyday",
    "other",
    "tattoo",
    "anime",
    "flower",
    "car",
    "dragon",
  ]);
  const tagParts: string[] = [];
  if (tags?.style && validStyles.has(tags.style)) tagParts.push(`${tags.style} style`);
  if (tags?.difficulty && validDifficulties.has(tags.difficulty))
    tagParts.push(`${tags.difficulty} difficulty`);
  if (tags?.scene && validScenes.has(tags.scene))
    tagParts.push(`${tags.scene} scene`);
  if (tags?.subject && validSubjects.has(tags.subject))
    tagParts.push(`${tags.subject} subject`);
  const tagPrompt = tagParts.join(", ");

  // Final prompt = tag context + optional user text. If both are missing the
  // model falls back to fully random ideas.
  const finalPrompt =
    [tagPrompt, userInput].filter(Boolean).join(" — ") || undefined;

  // ---- SSE stream ----

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          if (controller.desiredSize === null) {
            closed = true;
            return;
          }
          controller.enqueue(encoder.encode(ssePayload(event, data)));
        } catch {
          // Client disconnected mid-stream; swallow.
          closed = true;
        }
      };

      let savedCount = 0;
      let streamError: unknown = null;

      try {
        for await (const item of streamInspirations(finalPrompt)) {
          if (request.signal.aborted) break;
          try {
            const saved = await prisma.inspiration.create({
              data: {
                title: item.title.slice(0, 200),
                description: item.description,
                subject: toSubject(item.subject),
                style: toStyle(item.style),
                difficulty: toDifficulty(item.difficulty),
                mood: toMood(item.mood),
                scene: toScene(item.scene),
                timeEstimate: toTimeEstimate(item.time_estimate),
                audience: toAudience(item.audience),
                tags: item.tags ?? [],
                promptUsed: userInput || null,
                modelVersion: "deepseek-v4-flash",
                generatedBy: currentUser ? "user" : "anonymous",
                userId: currentUser?.id ?? null,
              },
            });
            send("item", serializeInspiration(saved));
            savedCount++;
          } catch (saveError) {
            console.error(
              "[generate] failed to persist inspiration:",
              saveError,
            );
            // Continue with the next item rather than aborting the whole batch.
          }
        }
      } catch (err) {
        streamError = err;
        console.error("[generate] stream error:", err);
      }

      if (savedCount === 0) {
        send("error", {
          error: "GENERATION_FAILED",
          message:
            streamError instanceof Error
              ? streamError.message
              : "No valid inspirations were generated. Please try again.",
        });
      } else {
        // New inspirations went into the DB — kick the sitemap cache so the
        // generated URLs become visible to crawlers without waiting for the
        // ISR window. Failures here must not abort the response.
        try {
          revalidatePath("/sitemap.xml");
        } catch (err) {
          console.error("[generate] revalidatePath(/sitemap.xml) failed:", err);
        }
        send("done", { remaining, count: savedCount });
      }

      try {
        controller.close();
      } catch {
        // already closed
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}