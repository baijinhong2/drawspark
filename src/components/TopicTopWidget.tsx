import { LotteryDraw } from "@/components/LotteryDraw";
import { SingleCardReveal } from "@/components/SingleCardReveal";
import { TopicInspirationGrid } from "@/components/TopicInspirationGrid";
import type { SeoTopicPage } from "@/lib/seo-pages";

/**
 * Top-of-page functional widget for SEO long-tail landing pages.
 *
 * Dispatches based on the topic's `intentType` to a widget tuned for
 * the user's state of mind:
 *
 *   - scene        → LotteryDraw (3-reel slot machine + lever)
 *                    User came bored and wants play; pulling the lever
 *                    3-cards-at-once is more satisfying than browsing.
 *
 *   - head-term    → SingleCardReveal (one big card + vibe filter +
 *     hub            "Surprise Me" tap)
 *                    User came with an open question like "what should
 *                    i draw" — wants ONE featured idea, not a grid.
 *
 *   - theme        → TopicInspirationGrid (curated filtered gallery)
 *     style        User came for a specific topic/style/difficulty
 *     difficulty   (christmas / aesthetic / easy) — wants to browse
 *                    curated themed art, not randomize.
 */
export async function TopicTopWidget({
  topic,
  locale,
}: {
  topic: SeoTopicPage;
  locale: string;
}) {
  if (topic.intentType === "scene") {
    return <LotteryDraw topic={topic} locale={locale} />;
  }

  if (
    topic.intentType === "head-term" ||
    topic.intentType === "hub"
  ) {
    return <SingleCardReveal topic={topic} locale={locale} />;
  }

  // theme | style | difficulty
  return <TopicInspirationGrid topic={topic} locale={locale} />;
}