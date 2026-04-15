import { I18N } from "#site";
import type { SiteLocale } from "#site";

export const EXPLORER_EXAMPLE_IDS = ["example-a", "example-b", "example-c"] as const;

export type ExplorerExampleId = (typeof EXPLORER_EXAMPLE_IDS)[number];

export interface ExplorerBodyExample {
  description: string;
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

export const [DEFAULT_EXPLORER_EXAMPLE_ID] = EXPLORER_EXAMPLE_IDS;

const EXPLORER_ROUTE_SEGMENT = "explorer";

interface BuildExplorerExamplesOptions {
  descriptions: Record<ExplorerExampleId, string>;
  locale: SiteLocale;
  titles: Record<ExplorerExampleId, string>;
}

export function buildExplorerExamples({
  descriptions,
  locale,
  titles,
}: BuildExplorerExamplesOptions): ExplorerBodyExample[] {
  return EXPLORER_EXAMPLE_IDS.map((id) => ({
    description: descriptions[id],
    href: buildExplorerHref(locale, id),
    id,
    title: titles[id],
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

export function buildExplorerHref(
  locale: SiteLocale | undefined,
  exampleId?: ExplorerExampleId,
): string {
  const path = `/${locale ?? I18N.defaultLocale}/${EXPLORER_ROUTE_SEGMENT}/`;

  return exampleId ? `${path}${exampleId}/` : path;
}

export function isExplorerExampleId(value: string): value is ExplorerExampleId {
  return EXPLORER_EXAMPLE_IDS.includes(value as ExplorerExampleId);
}
