import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { ScrollTopLink } from "./ScrollTopLink";

/**
 * Build a public URL for a SEO image slot.
 * - index omitted → single hero image (`{namespace}-seo-{section}-image.jpg`)
 * - index present → numbered card (`{namespace}-seo-{section}-image{n}.jpg`)
 */
function seoImageUrl(
  namespace: "home" | "generate" | "explore",
  section: "Whatis" | "Whois" | "doWith" | "realVoices",
  index?: number,
): string {
  const stem = index
    ? `${namespace}-seo-${section}-image${index}`
    : `${namespace}-seo-${section}-image`;
  return `/seoimage/${namespace}/${stem}.jpg`;
}

type SectionBase = {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonRoute?: string;
  photo?: string;
  photoThumbnail?: string;
  ext1?: string;
  ext2?: string;
  ext3?: string;
};

type ItemCard = SectionBase & {
  title?: string;
  description?: string;
  photo?: string;
};

type Head1 = SectionBase & {
  title: string;
  description: string;
  buttonText: string;
  buttonRoute: string;
};

type SeoSectionShape = SectionBase & {
  title: string;
  description?: string;
  content?: Array<SectionBase & Record<string, string | undefined>>;
};

type SeoData = {
  head1: Head1 | null;
  whatis: SeoSectionShape | null;
  howToUse: SeoSectionShape | null;
  doWith: SeoSectionShape | null;
  whois: SeoSectionShape | null;
  youNeed: SeoSectionShape | null;
  realVoices: SeoSectionShape | null;
  faq: SeoSectionShape | null;
};

/**
 * Read all SEO sections from a page namespace (`home`, `generate`, `explore`).
 * Returns `null` for sections that don't exist in the namespace.
 *
 * Uses `t.raw(key)` so we get the nested object/array structure instead of
 * forcing each leaf string through translations.
 */
export async function getSeoData(
  namespace: string,
  locale: string,
): Promise<SeoData> {
  const t = await getTranslations({ locale, namespace });

  const get = (key: string): SeoSectionShape | Head1 | null => {
    if (!t.has(key as never)) return null;
    return t.raw(key as never) as SeoSectionShape | Head1;
  };

  return {
    head1: get("head1") as Head1 | null,
    whatis: get("Whatis") as SeoSectionShape | null,
    howToUse: get("howToUse") as SeoSectionShape | null,
    doWith: get("doWith") as SeoSectionShape | null,
    whois: get("Whois") as SeoSectionShape | null,
    youNeed: get("youNeed") as SeoSectionShape | null,
    realVoices: get("realVoices") as SeoSectionShape | null,
    faq: get("faq") as SeoSectionShape | null,
  };
}

/**
 * Photo placeholder block. Used as the fallback when no SEO image has been
 * added for a slot, and for `head1` slots which don't have an image yet.
 */
function PhotoPlaceholder({
  aspect = "16/9",
  label = "Photo placeholder",
  rounded = "2xl",
}: {
  aspect?: string;
  label?: string;
  rounded?: "2xl" | "full";
}) {
  return (
    <div
      className={`relative w-full overflow-hidden ${
        rounded === "full" ? "rounded-full" : "rounded-2xl"
      } border-2 border-dashed border-violet-200 bg-violet-50/40`}
      style={{ aspectRatio: aspect }}
      aria-label={label}
      data-photo-placeholder={label}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-violet-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-10 w-10"
          aria-hidden
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 17l5-5 4 4 3-3 6 6" />
          <circle cx="9" cy="10" r="1.5" />
        </svg>
        <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
          [{label}]
        </span>
      </div>
    </div>
  );
}

/**
 * Render an SEO image at the slot for `namespace`/`section`/[index]. If the
 * asset is missing or fails to load, fall back to the dashed placeholder so
 * the page never shows a broken image.
 *
 * All SEO images are pre-compressed JPEGs in `/public/seoimage/{namespace}/`,
 * named `{namespace}-seo-{section}-image[{n}].jpg`.
 *
 * Pass `className` (e.g. `"h-14 w-14 shrink-0"`) to override the default
 * `w-full` container width — useful for inline reviewer avatars that should
 * stay a fixed pixel size.
 */
function SeoImage({
  namespace,
  section,
  index,
  alt,
  aspect,
  sizes,
  priority = false,
  rounded = "2xl",
  className,
}: {
  namespace: "home" | "generate" | "explore";
  section: "Whatis" | "Whois" | "doWith" | "realVoices";
  index?: number;
  alt: string;
  aspect: string;
  sizes: string;
  priority?: boolean;
  rounded?: "2xl" | "full";
  className?: string;
}) {
  const src = seoImageUrl(namespace, section, index);

  return (
    <div
      className={`relative overflow-hidden ${
        rounded === "full" ? "rounded-full" : "rounded-2xl"
      } bg-violet-50/40 ${className ?? "w-full"}`}
      style={{ aspectRatio: aspect }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      {eyebrow && (
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-600">
          {eyebrow}
        </div>
      )}
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base text-slate-600 sm:text-lg">{description}</p>
      )}
    </div>
  );
}

function PrimaryCta({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <ScrollTopLink
      href={href}
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
    >
      {children}
    </ScrollTopLink>
  );
}

/* ----- section renderers ----- */

function Head1Section({ data }: { data: Head1 }) {
  return (
    <section className="border-b border-slate-100 bg-gradient-to-b from-white to-violet-50/50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {data.title}
          </h1>
          <p className="mt-5 text-lg text-slate-600">{data.description}</p>
          {data.buttonText && (
            <div className="mt-7">
              <PrimaryCta href={data.buttonRoute || "/explore"}>
                {data.buttonText}
              </PrimaryCta>
            </div>
          )}
        </div>
        <PhotoPlaceholder aspect="4/3" label="Hero illustration" />
      </div>
    </section>
  );
}

function WhatisSection({
  data,
  namespace,
}: {
  data: SeoSectionShape;
  namespace: "home" | "generate" | "explore";
}) {
  const item = data.content?.[0];
  return (
    <section className="border-b border-slate-100 bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <SeoImage
          namespace={namespace}
          section="Whatis"
          alt={data.title}
          aspect="3/2"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
        <div>
          <SectionHeading title={data.title} />
          {item?.description && (
            <p className="text-base leading-relaxed text-slate-700">
              {item.description}
            </p>
          )}
          {item?.buttonText && (
            <div className="mt-6 text-center lg:text-left">
              <PrimaryCta href={item.buttonRoute || "/explore"}>
                {item.buttonText}
              </PrimaryCta>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function HowToUseSection({ data }: { data: SeoSectionShape }) {
  const steps = data.content ?? [];
  return (
    <section className="border-b border-slate-100 bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={data.title} />
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={i}
              className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-orange-500 text-sm font-bold text-white">
                {i + 1}
              </div>
              {step.title && (
                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
              )}
              {step.description && (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              )}
            </li>
          ))}
        </ol>
        {data.buttonText && (
          <div className="mt-10 text-center">
            <PrimaryCta href={data.buttonRoute || "/explore"}>
              {data.buttonText}
            </PrimaryCta>
          </div>
        )}
      </div>
    </section>
  );
}

function DoWithSection({
  data,
  namespace,
}: {
  data: SeoSectionShape;
  namespace: "home" | "generate" | "explore";
}) {
  const items = data.content ?? [];
  return (
    <section className="border-b border-slate-100 bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={data.title} description={data.description} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <article
              key={i}
              className="flex flex-col rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <SeoImage
                namespace={namespace}
                section="doWith"
                index={i + 1}
                alt={item.title ?? data.title}
                aspect="3/2"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              />
              {item.title && (
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {item.title}
                </h3>
              )}
              {item.description && (
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              )}
              {item.buttonText && (
                <div className="mt-4">
                  <ScrollTopLink
                    href={item.buttonRoute || "/explore"}
                    className="text-sm font-bold text-violet-600 hover:text-violet-800"
                  >
                    {item.buttonText} →
                  </ScrollTopLink>
                </div>
              )}
            </article>
          ))}
        </div>
        {data.buttonText && (
          <div className="mt-10 text-center">
            <PrimaryCta href={data.buttonRoute || "/explore"}>
              {data.buttonText}
            </PrimaryCta>
          </div>
        )}
      </div>
    </section>
  );
}

function WhoisSection({
  data,
  namespace,
}: {
  data: SeoSectionShape;
  namespace: "home" | "generate" | "explore";
}) {
  const items = data.content ?? [];
  return (
    <section className="border-b border-slate-100 bg-violet-50/40 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={data.title} />
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, i) => (
            <article
              key={i}
              className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm"
            >
              <SeoImage
                namespace={namespace}
                section="Whois"
                index={i + 1}
                alt={item.title ?? data.title}
                aspect="1/1"
                sizes="(min-width: 768px) 33vw, 100vw"
                rounded="full"
              />
              {item.title && (
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {item.title}
                </h3>
              )}
              {item.description && (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              )}
            </article>
          ))}
        </div>
        {data.buttonText && (
          <div className="mt-10 text-center">
            <PrimaryCta href={data.buttonRoute || "/explore"}>
              {data.buttonText}
            </PrimaryCta>
          </div>
        )}
      </div>
    </section>
  );
}

function YouNeedSection({ data }: { data: SeoSectionShape }) {
  const items = data.content ?? [];
  return (
    <section className="border-b border-slate-100 bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={data.title} />
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, i) => (
            <article
              key={i}
              className="rounded-2xl border border-violet-100 bg-violet-50/30 p-6"
            >
              {item.title && (
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              )}
              {item.description && (
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {item.description}
                </p>
              )}
            </article>
          ))}
        </div>
        {data.buttonText && (
          <div className="mt-10 text-center">
            <PrimaryCta href={data.buttonRoute || "/explore"}>
              {data.buttonText}
            </PrimaryCta>
          </div>
        )}
      </div>
    </section>
  );
}

function RealVoicesSection({
  data,
  namespace,
}: {
  data: SeoSectionShape;
  namespace: "home" | "generate" | "explore";
}) {
  const items = data.content ?? [];
  return (
    <section className="border-b border-slate-100 bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title={data.title}
          description={
            data.ext1 || data.ext2
              ? `${data.ext1 ?? ""}${data.ext1 && data.ext2 ? " · " : ""}${data.ext2 ?? ""}`
              : undefined
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const reviewerAlt = [item.ext2, item.ext3].filter(Boolean).join(", ");
            return (
              <article
                key={i}
                className="flex h-full flex-col rounded-2xl border border-violet-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <SeoImage
                    namespace={namespace}
                    section="realVoices"
                    index={i + 1}
                    alt={reviewerAlt || data.title}
                    aspect="1/1"
                    sizes="56px"
                    rounded="full"
                    className="h-14 w-14 shrink-0"
                  />
                  <div className="min-w-0">
                    {item.ext2 && (
                      <div className="truncate text-sm font-bold text-slate-900">
                        {item.ext2}
                      </div>
                    )}
                    {item.ext3 && (
                      <div className="truncate text-xs text-slate-500">
                        {item.ext3}
                      </div>
                    )}
                    {item.ext1 && (
                      <div className="mt-1 text-xs font-semibold text-orange-500">
                        ★ {item.ext1}
                      </div>
                    )}
                  </div>
                </div>
                {item.title && (
                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {item.title}
                  </h3>
                )}
                {item.description && (
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        {data.buttonText && (
          <div className="mt-10 text-center">
            <PrimaryCta href={data.buttonRoute || "/explore"}>
              {data.buttonText}
            </PrimaryCta>
          </div>
        )}
      </div>
    </section>
  );
}

function FaqSection({ data }: { data: SeoSectionShape }) {
  const items = data.content ?? [];
  return (
    <section className="border-b border-slate-100 bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <SectionHeading title={data.title} />
        <div className="space-y-3">
          {items.map((item, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-violet-100 bg-violet-50/30 p-5 transition open:bg-white open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                <span>{item.title}</span>
                <span className="text-violet-600 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              {item.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {item.description}
                </p>
              )}
            </details>
          ))}
        </div>
        {data.buttonText && (
          <div className="mt-10 text-center">
            <PrimaryCta href={data.buttonRoute || "/explore"}>
              {data.buttonText}
            </PrimaryCta>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Render the SEO content sections for a page (head1 + head2 sections).
 * Skips sections whose namespace key is missing.
 */
export async function SeoSections({
  namespace,
  locale,
  showHead1 = false,
}: {
  namespace: "home" | "generate" | "explore";
  locale: string;
  /**
   * Some pages (home) already render their own hero. Set `false` to suppress
   * the head1 block and only render the head2 sections.
   */
  showHead1?: boolean;
}) {
  const data = await getSeoData(namespace, locale);

  return (
    <>
      {showHead1 && data.head1 && <Head1Section data={data.head1} />}
      {data.whatis && (
        <WhatisSection data={data.whatis} namespace={namespace} />
      )}
      {data.howToUse && <HowToUseSection data={data.howToUse} />}
      {data.doWith && (
        <DoWithSection data={data.doWith} namespace={namespace} />
      )}
      {data.whois && <WhoisSection data={data.whois} namespace={namespace} />}
      {data.youNeed && <YouNeedSection data={data.youNeed} />}
      {data.realVoices && (
        <RealVoicesSection data={data.realVoices} namespace={namespace} />
      )}
      {data.faq && <FaqSection data={data.faq} />}
    </>
  );
}