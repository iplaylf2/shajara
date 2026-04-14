export const I18N = {
  defaultLocale: "en",
  locales: {
    en: {
      label: "English",
      lang: "en",
    },
    "zh-cn": {
      label: "中文",
      lang: "zh-CN",
    },
  },
} as const;

export type SiteLocale = keyof typeof I18N.locales;

export const SECONDARY_SITE_LOCALES = (Object.keys(I18N.locales) as SiteLocale[]).filter(
  (locale) => locale !== I18N.defaultLocale,
);

export const STARLIGHT_LOCALES = {
  root: {
    label: I18N.locales.en.label,
    lang: I18N.locales.en.lang,
  },
  "zh-cn": {
    label: I18N.locales["zh-cn"].label,
    lang: I18N.locales["zh-cn"].lang,
  },
} as const;
