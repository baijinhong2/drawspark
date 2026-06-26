import { getTranslations } from "next-intl/server";
import { LotteryDrawClient } from "@/components/LotteryDrawClient";
import { fetchInspirationsForTopic } from "@/lib/topic-inspirations";
import type { SeoTopicPage } from "@/lib/seo-pages";

/**
 * Server wrapper around the client LotteryDraw (slot machine) widget.
 * Pulls a larger pool (24) so each lever yank reveals fresh cards,
 * not repeats from the same handful.
 */
export async function LotteryDraw({
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
    <LotteryDrawClient
      pool={inspirations}
      title={t("lottery.title")}
      subtitle={t("lottery.subtitle")}
      leverButtonIdle={t("lottery.leverIdle")}
      leverButtonSpinning={t("lottery.leverSpinning")}
      generateButtonText={t("lottery.generateCta")}
      generateHref={generateHref}
      emptyHint={t("lottery.emptyHint")}
    />
  );
}