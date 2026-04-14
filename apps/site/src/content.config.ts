import { I18N } from "#site";
import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

function generateDocsId({ entry }: { entry: string }): string {
  const withoutExtension = entry.replace(/\.[^.]+$/, "");
  const withoutDefaultLocalePrefix = withoutExtension.replace(
    new RegExp(`^${I18N.defaultLocale}/`),
    "",
  );

  return withoutDefaultLocalePrefix.replace(/\/index$/, "") || "index";
}

export const collections: { docs: ReturnType<typeof defineCollection> } = {
  docs: defineCollection({
    loader: docsLoader({ generateId: generateDocsId }),
    schema: docsSchema(),
  }),
};
