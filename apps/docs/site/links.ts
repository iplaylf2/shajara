import { I18N } from "./i18n";
import type { SiteLocale } from "./i18n";

export function docsHomeLink(locale: SiteLocale): string {
  return localizePath("/", locale);
}

function localizePath(path: `/${string}`, locale: SiteLocale): string {
  if (locale === I18N.defaultLocale) {
    return path;
  }

  return path === "/" ? `/${locale}/` : `/${locale}${path}`;
}
