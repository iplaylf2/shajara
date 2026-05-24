import { i18N, siteLocales } from "./i18n";
import type { NonEmptyTuple } from "type-fest";
import type { SiteLocale } from "./i18n";
import type { StarlightUserConfig } from "@astrojs/starlight/types";

export function getFirstDocSlug(): string {
  const [section] = siteSidebar;
  const [page] = section.pages;

  return `${section.directory}/${page}`;
}

const siteSidebar = [
  {
    directory: "guides",
    label: {
      en: "Guides",
      "zh-cn": "指南",
    },
    pages: [
      "getting-started",
      "promise-patterns",
      "scope-and-process",
      "scope-convergence",
      "external-handles",
      "create-scope",
    ],
  },
  {
    directory: "topics",
    label: {
      en: "Topics",
      "zh-cn": "专题",
    },
    pages: ["futures", "channels", "context", "recovery"],
  },
  {
    directory: "concepts",
    label: {
      en: "Concepts",
      "zh-cn": "概念",
    },
    pages: [
      "routines-and-coroutines",
      "scope-tree",
      "scope-exit",
      "handles-and-scope-ownership",
      "scope-autonomy",
    ],
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
  pages: SidebarPages;
}

interface StarlightSidebarText {
  label: string;
  translations: Record<string, string>;
}

type StarlightSidebar = NonNullable<StarlightUserConfig["sidebar"]>;
type SiteSidebar = NonEmptyTuple<SiteSidebarSection>;
type LocalizedSidebarText = Record<SiteLocale, string>;
type SidebarPages = NonEmptyTuple<string>;
