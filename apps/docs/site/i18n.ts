export const i18N = {
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

export type SiteLocale = keyof typeof i18N.locales;

export const siteLocales = Object.keys(i18N.locales) as SiteLocale[];

export const starlightLocales = Object.fromEntries(
  Object.entries(i18N.locales).map(([locale, config]) => [
    locale,
    {
      label: config.label,
      lang: config.lang,
    },
  ]),
) as {
  [Locale in SiteLocale]: {
    label: (typeof i18N.locales)[Locale]["label"];
    lang: (typeof i18N.locales)[Locale]["lang"];
  };
};
