import { I18N } from "#site";
import type { SiteLocale } from "#site";

export function docsHomeLink(locale: SiteLocale | undefined): string {
  return `/${locale ?? I18N.defaultLocale}/`;
}
