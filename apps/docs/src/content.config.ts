import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { defineCollection } from "astro:content";
import { explorerUiI18nSchema } from "#/content/i18n-schema";

export const collections: Record<string, ReturnType<typeof defineCollection>> = {
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
