import type { Entries } from "type-fest";
import type { ExplorerExampleId } from "#/domain/explorer/examples";
import type { SiteLocale } from "#site";
import { getRelativeLocaleUrl } from "astro:i18n";
import { i18N } from "#site";

export function buildExplorerLocaleLinks(
  currentExampleId: ExplorerExampleId,
): ExplorerBodyLocaleLink[] {
  return SITE_LOCALE_ENTRIES.map(([locale, localeConfig]) => ({
    href: buildExplorerHref(locale, currentExampleId),
    hreflang: localeConfig.lang,
    label: localeConfig.label,
  }));
}

export function buildExplorerHref(locale: SiteLocale, exampleId: ExplorerExampleId): string {
  const route = `${EXPLORER_ROUTE_SEGMENT}/${exampleId}`;

  return getRelativeLocaleUrl(i18N.locales[locale].lang, route);
}

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
  label: string;
}

const EXPLORER_ROUTE_SEGMENT = "explorer";
const SITE_LOCALE_ENTRIES = Object.entries(i18N.locales) as Entries<typeof i18N.locales>;
