import { SITE, STARLIGHT_LOCALES, localizePath } from "./site";
import type { SiteLocale } from "./site";
import type { StarlightUserConfig } from "@astrojs/starlight/types";

export const docsConfig = {
  defaultLocale: "root",
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

export function docsHomeLink(locale: SiteLocale): string {
  return localizePath("/", locale);
}
