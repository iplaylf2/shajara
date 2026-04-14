import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { I18N } from "#site";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

function generateDocsId({ entry }: { entry: string }): string {
  const withoutExtension = entry.replace(/\.[^.]+$/, "");
  const withoutDefaultLocalePrefix = withoutExtension.replace(
    new RegExp(`^${I18N.defaultLocale}/`),
    "",
  );

  return withoutDefaultLocalePrefix.replace(/\/index$/, "") || "index";
}

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
      extend: z.object({
        "demo.counter.button": z.string().optional(),
        "demo.counter.countLabel": z.string().optional(),
        "demo.home.intro": z.string().optional(),
        "demo.home.title": z.string().optional(),
        "demo.shell.backToDocs": z.string().optional(),
        "demo.shell.eyebrow": z.string().optional(),
      }),
    }),
  }),
};
