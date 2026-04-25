import { i18N, site, starlightLocales } from "./site";
import type { StarlightUserConfig } from "@astrojs/starlight/types";

export const docsConfig = {
  defaultLocale: i18N.defaultLocale,
  description: site.description,
  disable404Route: true,
  locales: starlightLocales,
  sidebar: [
    {
      autogenerate: { directory: "guides" },
      label: "Guides",
    },
  ],
  social: [
    {
      href: site.repositoryUrl,
      icon: "github",
      label: "GitHub",
    },
  ],
  title: site.title,
} satisfies StarlightUserConfig;
