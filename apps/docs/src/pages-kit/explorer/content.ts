import type { ExplorerStage } from "#/domain/explorer/stage";
import { I18N } from "#site";
import type { SiteLocale } from "#site";
import { getRelativeLocaleUrl } from "astro:i18n";

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

export function buildExplorerHref(locale: SiteLocale, exampleId?: ExplorerExampleId): string {
  const route = exampleId ? `${EXPLORER_ROUTE_SEGMENT}/${exampleId}` : EXPLORER_ROUTE_SEGMENT;

  return getRelativeLocaleUrl(I18N.locales[locale].lang, route);
}

export const EXPLORER_EXAMPLES = [
  {
    descriptionKey: "explorer.examples.host-concurrency.description",
    guideKeys: [
      "explorer.examples.host-concurrency.guide.scope",
      "explorer.examples.host-concurrency.guide.spawn",
      "explorer.examples.host-concurrency.guide.wait",
    ],
    id: "host-concurrency",
    stage: {
      kind: "host-concurrency",
    },
    titleKey: "explorer.examples.host-concurrency.title",
  },
] as const;

export const EXPLORER_EXAMPLE_IDS = EXPLORER_EXAMPLES.map((example) => example.id);
export const DEFAULT_EXPLORER_EXAMPLE_ID = readFirstExplorerExample().id;

export type ExplorerExampleId = (typeof EXPLORER_EXAMPLE_IDS)[number];
export type ExplorerExampleDefinition = (typeof EXPLORER_EXAMPLES)[number];

export interface ExplorerBodyExample {
  description: string;
  guideRows: readonly string[];
  href: string;
  id: ExplorerExampleId;
  stage: ExplorerStage;
  title: string;
}

export interface ExplorerBodyLocaleLink {
  href: string;
  hreflang: string;
  isCurrent: boolean;
  label: string;
}

function readFirstExplorerExample(): ExplorerExampleDefinition {
  const [firstExplorerExample] = EXPLORER_EXAMPLES;

  if (!firstExplorerExample) {
    throw new Error("Explorer requires at least one example.");
  }

  return firstExplorerExample;
}

const EXPLORER_ROUTE_SEGMENT = "explorer";
