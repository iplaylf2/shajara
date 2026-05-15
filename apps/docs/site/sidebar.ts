import { i18N, siteLocales } from "./i18n";
import type { SiteLocale } from "./i18n";
import type { StarlightUserConfig } from "@astrojs/starlight/types";

const siteSidebar = [
  {
    directory: "guides",
    label: {
      en: "Guides",
      "zh-cn": "指南",
    },
    pages: ["getting-started", "promise-patterns"],
  },
] satisfies SiteSidebar;

export const starlightSidebar: StarlightSidebar = toStarlightSidebar(siteSidebar);

function toStarlightSidebar(sidebar: SiteSidebar): StarlightSidebar {
  return sidebar.map((section) => ({
    items: section.pages.map((page) => `${section.directory}/${page}`),
    ...toStarlightSidebarText(section.label),
  }));
}

function toStarlightSidebarText(text: LocalizedSidebarText): StarlightSidebarText {
  return {
    label: text[i18N.defaultLocale],
    translations: Object.fromEntries(
      siteLocales.map((locale) => [i18N.locales[locale].lang, text[locale]]),
    ),
  };
}

interface SiteSidebarSection {
  directory: string;
  label: LocalizedSidebarText;
  pages: readonly string[];
}

interface StarlightSidebarText {
  label: string;
  translations: Record<string, string>;
}

type StarlightSidebar = NonNullable<StarlightUserConfig["sidebar"]>;
type SiteSidebar = readonly SiteSidebarSection[];
type LocalizedSidebarText = Record<SiteLocale, string>;
