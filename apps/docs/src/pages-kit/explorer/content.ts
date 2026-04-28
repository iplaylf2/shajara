import type { Entries } from "type-fest";
import type { ExplorerExampleId } from "#/domain/explorer/examples";
import type { SiteLocale } from "#site";
import { getRelativeLocaleUrl } from "astro:i18n";
import { i18N } from "#site";

export function buildExplorerLocaleLinks(
  currentExampleId: ExplorerExampleId,
): ExplorerLocaleLink[] {
  return siteLocaleEntries.map(([locale, localeConfig]) => ({
    href: buildExplorerHref(locale, currentExampleId),
    hreflang: localeConfig.lang,
    label: localeConfig.label,
  }));
}

export function buildExplorerHref(locale: SiteLocale, exampleId: ExplorerExampleId): string {
  const route = `${EXPLORER_ROUTE_SEGMENT}/${exampleId}`;

  return getRelativeLocaleUrl(i18N.locales[locale].lang, route);
}

export interface ExplorerExampleSummary {
  description: string;
  guideRows: readonly string[];
  href: string;
  id: ExplorerExampleId;
  title: string;
}

export interface ExplorerLocaleLink {
  href: string;
  hreflang: string;
  label: string;
}

const EXPLORER_ROUTE_SEGMENT = "explorer";
const siteLocaleEntries = Object.entries(i18N.locales) as Entries<typeof i18N.locales>;
