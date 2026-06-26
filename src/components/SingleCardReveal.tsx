import { getTranslations } from "next-intl/server";
import { SingleCardRevealClient } from "@/components/SingleCardRevealClient";
import { fetchInspirationsForTopic } from "@/lib/topic-inspirations";
import type { SeoTopicPage } from "@/lib/seo-pages";

/**
 * Server wrapper around the client SingleCardReveal widget. Fetches a
 * larger pool (24) than the spinner because the user can flip through
 * many more cards here, and the vibe-filter happens client-side.
 */
export async function SingleCardReveal({
  topic,
  locale: _locale,
}: {
  topic: SeoTopicPage;
  locale: string;
}) {
  const t = await getTranslations("topics");
  const inspirations = await fetchInspirationsForTopic(topic, 24);

  const generateHref = topic.generatePrompt
    ? `/generate?q=${encodeURIComponent(topic.generatePrompt)}`
    : "/generate";

  return (
    <SingleCardRevealClient
      pool={inspirations}
      title={t("singleCard.title")}
      subtitle={t("singleCard.subtitle")}
      generateButtonText={t("singleCard.generateCta")}
      generateHref={generateHref}
      emptyHint={t("singleCard.emptyHint")}
      vibeAny={t("singleCard.vibeAny")}
      vibeCute={t("singleCard.vibeCute")}
      vibeCool={t("singleCard.vibeCool")}
      vibeEasy={t("singleCard.vibeEasy")}
      vibeAesthetic={t("singleCard.vibeAesthetic")}
    />
  );
}