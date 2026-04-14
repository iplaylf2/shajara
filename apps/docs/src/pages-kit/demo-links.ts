import { I18N } from "#site";
import { getRelativeLocaleUrl } from "astro:i18n";

export function docsHomeLink(locale: string | undefined): string {
  return getRelativeLocaleUrl(locale ?? I18N.locales[I18N.defaultLocale].lang, "");
}
