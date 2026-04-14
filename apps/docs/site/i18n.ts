export const I18N = {
  defaultLocale: "en",
  locales: {
    en: {
      label: "English",
      lang: "en",
    },
    zh: {
      label: "中文",
      lang: "zh-CN",
    },
  },
} as const;

export type SiteLocale = keyof typeof I18N.locales;

export const SITE_LOCALES = Object.keys(I18N.locales) as SiteLocale[];
export const SECONDARY_SITE_LOCALES = SITE_LOCALES.filter(
  (locale) => locale !== I18N.defaultLocale,
);

export const STARLIGHT_LOCALES = {
  root: {
    label: I18N.locales.en.label,
    lang: I18N.locales.en.lang,
  },
  zh: {
    label: I18N.locales.zh.label,
    lang: I18N.locales.zh.lang,
  },
} as const;

export function siteLanguageTag(locale: SiteLocale): string {
  return I18N.locales[locale].lang;
}
