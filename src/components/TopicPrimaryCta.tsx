import { Link } from "@/i18n/navigation";
import type { SeoTopicPage } from "@/lib/seo-pages";

/**
 * The primary conversion CTA shown on every SEO topic page, between the
 * inspiration grid (top) and the H1 (middle). Passes the topic's
 * pre-filled prompt text through to /generate so the user's first
 * generation is already biased toward this topic.
 */
export function TopicPrimaryCta({
  topic,
  locale,
  buttonText,
  promptHint,
}: {
  topic: SeoTopicPage;
  locale: string;
  buttonText: string;
  promptHint: string;
}) {
  const href = topic.generatePrompt
    ? `/generate?q=${encodeURIComponent(topic.generatePrompt)}`
    : "/generate";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-2 pb-2 sm:px-6">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
        <Link
          href={href}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg sm:w-auto"
        >
          <span aria-hidden>✨</span>
          <span>{buttonText}</span>
        </Link>
        {promptHint && (
          <span className="text-xs text-slate-500 sm:text-sm">
            {promptHint}
          </span>
        )}
      </div>
    </div>
  );
}