import type { Entries } from "type-fest";

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
const SITE_LOCALE_ENTRIES = Object.entries(I18N.locales) as Entries<typeof I18N.locales>;

export const STARLIGHT_LOCALES = Object.fromEntries(
  SITE_LOCALE_ENTRIES.map(([locale, config]) => [
    locale,
    {
      label: config.label,
      lang: config.lang,
    },
  ]),
) as {
  [Locale in SiteLocale]: {
    label: (typeof I18N.locales)[Locale]["label"];
    lang: (typeof I18N.locales)[Locale]["lang"];
  };
};
