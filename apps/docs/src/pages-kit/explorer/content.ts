import type { Entries } from "type-fest";
import type { ExplorerExampleId } from "#/domain/explorer/examples";
import { I18N } from "#site";
import type { SiteLocale } from "#site";
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

const EXPLORER_ROUTE_SEGMENT = "explorer";
const SITE_LOCALE_ENTRIES = Object.entries(I18N.locales) as Entries<typeof I18N.locales>;
