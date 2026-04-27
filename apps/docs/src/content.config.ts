import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { defineCollection } from "astro:content";
import { explorerUiI18nSchema } from "./content/i18n-schema";

type ContentCollectionName = "docs" | "i18n";
type ContentCollection = ReturnType<typeof defineCollection>;

export const collections: Record<ContentCollectionName, ContentCollection> = {
  docs: defineCollection({
    loader: docsLoader({ generateId: generateDocsId }),
    schema: docsSchema(),
  }),
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema({
      extend: explorerUiI18nSchema,
    }),
  }),
};

function generateDocsId({ entry }: { entry: string }): string {
  const withoutExtension = entry.replace(/\.[^.]+$/, "");
  return withoutExtension.replace(/\/index$/, "") || "index";
}
