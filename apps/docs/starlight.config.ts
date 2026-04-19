import { I18N, SITE, STARLIGHT_LOCALES } from "./site";
import type { StarlightUserConfig } from "@astrojs/starlight/types";

export const docsConfig = {
  defaultLocale: I18N.defaultLocale,
  description: SITE.description,
  disable404Route: true,
  locales: STARLIGHT_LOCALES,
  sidebar: [
    {
      autogenerate: { directory: "guides" },
      label: "Guides",
    },
  ],
  social: [
    {
      href: SITE.repositoryUrl,
      icon: "github",
      label: "GitHub",
    },
  ],
  title: SITE.title,
} satisfies StarlightUserConfig;
