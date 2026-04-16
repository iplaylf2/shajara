import { I18N } from "#site";
import type { SiteLocale } from "#site";
import { getRelativeLocaleUrl } from "astro:i18n";

export const EXPLORER_EXAMPLES = [
  {
    descriptionKey: "explorer.examples.host-concurrency.description",
    guideKeys: [
      "explorer.examples.host-concurrency.guide.scope",
      "explorer.examples.host-concurrency.guide.spawn",
      "explorer.examples.host-concurrency.guide.wait",
    ],
    id: "host-concurrency",
    stage: "host-concurrency",
    titleKey: "explorer.examples.host-concurrency.title",
  },
] as const;

export const EXPLORER_EXAMPLE_IDS = EXPLORER_EXAMPLES.map((example) => example.id);

export type ExplorerExampleId = (typeof EXPLORER_EXAMPLE_IDS)[number];
export type ExplorerStageKind = (typeof EXPLORER_EXAMPLES)[number]["stage"];
export type ExplorerExampleDefinition = (typeof EXPLORER_EXAMPLES)[number];

export interface ExplorerBodyExample {
  description: string;
  guideRows: readonly string[];
  href: string;
  id: ExplorerExampleId;
  stage: ExplorerStageKind;
  title: string;
}

export interface ExplorerBodyLocaleLink {
  href: string;
  hreflang: string;
  isCurrent: boolean;
  label: string;
}

export const DEFAULT_EXPLORER_EXAMPLE_ID = readFirstExplorerExample().id;

export function buildExplorerExamples(
  locale: SiteLocale,
  translate: (key: ExplorerExampleTranslationKey) => string,
): ExplorerBodyExample[] {
  return EXPLORER_EXAMPLES.map((example) => ({
    description: translate(example.descriptionKey),
    guideRows: example.guideKeys.map((key) => translate(key)),
    href: buildExplorerHref(locale, example.id),
    id: example.id,
    stage: example.stage,
    title: translate(example.titleKey),
  }));
}

export function buildExplorerLocaleLinks(
  currentExampleId: ExplorerExampleId | undefined,
  currentLocale: SiteLocale,
): ExplorerBodyLocaleLink[] {
  return (Object.entries(I18N.locales) as [SiteLocale, (typeof I18N.locales)[SiteLocale]][]).map(
    ([locale, localeConfig]) => ({
      href: buildExplorerHref(locale, currentExampleId),
      hreflang: localeConfig.lang,
      isCurrent: locale === currentLocale,
      label: localeConfig.label,
    }),
  );
}

export function isExplorerExampleId(value: string): value is ExplorerExampleId {
  return EXPLORER_EXAMPLE_IDS.includes(value as ExplorerExampleId);
}

export function readExplorerExample(
  exampleId: ExplorerExampleId,
  examples: readonly ExplorerBodyExample[],
): ExplorerBodyExample {
  const example = examples.find((entry) => entry.id === exampleId);

  if (!example) {
    throw new Error(`Missing explorer example: ${exampleId}`);
  }

  return example;
}

const EXPLORER_ROUTE_SEGMENT = "explorer";

function buildExplorerHref(locale: SiteLocale, exampleId?: ExplorerExampleId): string {
  const route = exampleId ? `${EXPLORER_ROUTE_SEGMENT}/${exampleId}` : EXPLORER_ROUTE_SEGMENT;

  return getRelativeLocaleUrl(I18N.locales[locale].lang, route);
}

function readFirstExplorerExample(): ExplorerExampleDefinition {
  const [firstExplorerExample] = EXPLORER_EXAMPLES;

  if (!firstExplorerExample) {
    throw new Error("Explorer requires at least one example.");
  }

  return firstExplorerExample;
}

type ExplorerExampleTranslationKey =
  | ExplorerExampleDefinition["descriptionKey"]
  | ExplorerExampleDefinition["guideKeys"][number]
  | ExplorerExampleDefinition["titleKey"];
