import type { ArrayValues, Entries } from "type-fest";
import { I18N } from "#site";
import type { SiteLocale } from "#site";
import { forkJoinExample } from "./examples/fork-join";
import { getRelativeLocaleUrl } from "astro:i18n";

export function buildExplorerLocaleLinks(
  currentExampleId: ExplorerExampleId | undefined,
  currentLocale: SiteLocale,
): ExplorerBodyLocaleLink[] {
  return SITE_LOCALE_ENTRIES.map(([locale, localeConfig]) => ({
    href: buildExplorerHref(locale, currentExampleId),
    hreflang: localeConfig.lang,
    isCurrent: locale === currentLocale,
    label: localeConfig.label,
  }));
}

export function buildExplorerHref(locale: SiteLocale, exampleId?: ExplorerExampleId): string {
  const route = exampleId ? `${EXPLORER_ROUTE_SEGMENT}/${exampleId}` : EXPLORER_ROUTE_SEGMENT;

  return getRelativeLocaleUrl(I18N.locales[locale].lang, route);
}

export const EXPLORER_EXAMPLES = [forkJoinExample] as const;

export const EXPLORER_EXAMPLE_IDS = EXPLORER_EXAMPLES.map((example) => example.id);
export const DEFAULT_EXPLORER_EXAMPLE_ID = readFirstExplorerExample().id;

export type ExplorerExampleId = (typeof EXPLORER_EXAMPLE_IDS)[number];
export type ExplorerExampleDefinition = ArrayValues<typeof EXPLORER_EXAMPLES>;

export interface ExplorerBodyExample {
  description: string;
  guideRows: readonly string[];
  href: string;
  id: ExplorerExampleId;
  title: string;
}

export interface ExplorerBodyLocaleLink {
  href: string;
  hreflang: string;
  isCurrent: boolean;
  label: string;
}

export function readExplorerExample(exampleId: ExplorerExampleId): ExplorerExampleDefinition {
  const example = EXPLORER_EXAMPLES.find((entry) => entry.id === exampleId);

  if (!example) {
    throw new Error(`Unknown explorer example: ${exampleId}`);
  }

  return example;
}

function readFirstExplorerExample(): ExplorerExampleDefinition {
  const [firstExplorerExample] = EXPLORER_EXAMPLES;

  if (!firstExplorerExample) {
    throw new Error("Explorer requires at least one example.");
  }

  return firstExplorerExample;
}

const EXPLORER_ROUTE_SEGMENT = "explorer";
const SITE_LOCALE_ENTRIES = Object.entries(I18N.locales) as Entries<typeof I18N.locales>;
