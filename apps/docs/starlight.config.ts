import { SITE, STARLIGHT_LOCALES } from "./site";
import type { StarlightUserConfig } from "@astrojs/starlight/types";

export const docsConfig = {
  defaultLocale: "en",
  description: SITE.description,
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
