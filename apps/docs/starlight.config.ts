import { i18N, site, starlightLocales, starlightSidebar } from "./site";
import type { StarlightUserConfig } from "@astrojs/starlight/types";

export const docsConfig: StarlightUserConfig = {
  defaultLocale: i18N.defaultLocale,
  description: site.description,
  disable404Route: true,
  locales: starlightLocales,
  sidebar: starlightSidebar,
  social: [
    {
      href: site.repositoryUrl,
      icon: "github",
      label: "GitHub",
    },
  ],
  title: site.title,
};
