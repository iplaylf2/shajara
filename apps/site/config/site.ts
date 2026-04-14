export const I18N = {
  defaultLocale: "en",
  locales: {
    en: "English",
    zh: "中文",
  },
} as const;

export type SiteLocale = keyof typeof I18N.locales;
export const SITE_LOCALES = Object.keys(I18N.locales) as SiteLocale[];
export const SECONDARY_SITE_LOCALES = SITE_LOCALES.filter(
  (locale) => locale !== I18N.defaultLocale,
);

export const STARLIGHT_LOCALES = {
  root: {
    label: I18N.locales.en,
    lang: "en",
  },
  zh: {
    label: I18N.locales.zh,
    lang: "zh",
  },
} as const;

export const SITE = {
  description: "Structured concurrency for JavaScript applications and runtimes.",
  repositoryUrl: "https://github.com/iplaylf2/shajara",
  title: "shajara",
} as const;

export function localizePath(path: `/${string}`, locale: SiteLocale): string {
  if (locale === I18N.defaultLocale) {
    return path;
  }

  return path === "/" ? `/${locale}/` : `/${locale}${path}`;
}
