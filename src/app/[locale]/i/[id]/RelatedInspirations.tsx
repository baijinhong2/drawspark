import { Link } from "@/i18n/navigation";
import { IconLike } from "@/components/icons";
import { inspirationHref } from "@/lib/slug";
import { formatCount } from "@/lib/format";
import type { InspirationResponse } from "@/lib/types";

interface RelatedInspirationsProps {
  inspirations: InspirationResponse[];
  authorLabel: string;
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700",
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-rose-100 text-rose-700",
};

export function RelatedInspirations({
  inspirations,
}: RelatedInspirationsProps) {
  if (inspirations.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
      <h2 className="mb-4 text-lg font-bold text-slate-900 sm:text-xl">
        Similar Drawing Ideas
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {inspirations.map((item) => (
          <li key={item.id}>
            <Link
              href={inspirationHref(item.id)}
              prefetch={false}
              className="group flex h-full flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
            >
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                  {Array.isArray(item.subject) ? item.subject[0] : item.subject}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    difficultyColors[item.difficulty] ??
                    "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.difficulty}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <IconLike className="size-3" />
                  {formatCount(item.likes_count)}
                </span>
              </div>
              <h3 className="mb-1 line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-violet-700">
                {item.title}
              </h3>
              {item.description && (
                <p className="line-clamp-2 text-xs text-slate-600">
                  {item.description}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}