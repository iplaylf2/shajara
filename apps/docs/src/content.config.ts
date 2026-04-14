import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { I18N } from "#site";
import { defineCollection } from "astro:content";
import { demoUiI18nSchema } from "#/content/i18n-schema";

export const collections: {
  docs: ReturnType<typeof defineCollection>;
  i18n: ReturnType<typeof defineCollection>;
} = {
  docs: defineCollection({
    loader: docsLoader({ generateId: generateDocsId }),
    schema: docsSchema(),
  }),
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema({
      extend: demoUiI18nSchema,
    }),
  }),
};

function generateDocsId({ entry }: { entry: string }): string {
  const withoutExtension = entry.replace(/\.[^.]+$/, "");
  const withoutDefaultLocalePrefix = withoutExtension.replace(
    new RegExp(`^${I18N.defaultLocale}/`),
    "",
  );

  return withoutDefaultLocalePrefix.replace(/\/index$/, "") || "index";
}
