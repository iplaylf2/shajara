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

export const SITE_LOCALES = Object.keys(I18N.locales) as SiteLocale[];

export const STARLIGHT_LOCALES = Object.fromEntries(
  (Object.entries(I18N.locales) as [SiteLocale, (typeof I18N.locales)[SiteLocale]][]).map(
    ([locale, config]) => [
      locale,
      {
        label: config.label,
        lang: config.lang,
      },
    ],
  ),
) as {
  [Locale in SiteLocale]: {
    label: (typeof I18N.locales)[Locale]["label"];
    lang: (typeof I18N.locales)[Locale]["lang"];
  };
};
