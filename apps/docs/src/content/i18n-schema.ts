import type { ExplorerExampleDefinition } from "#/domain/explorer/examples";
import { explorerExamples } from "#/domain/explorer/examples";
import { z } from "astro/zod";

const staticExplorerUiI18nKeys = [
  "docs.404.description",
  "docs.404.tagline",
  "docs.404.title",
  "docs.home.body",
  "docs.home.description",
  "docs.home.hero.apiMap",
  "docs.home.hero.docs",
  "docs.home.hero.explorer",
  "docs.home.hero.tagline",
  "docs.home.title",
  "explorer.home.title",
  "explorer.replay.follow",
  "explorer.replay.manual",
  "explorer.shell.backToDocs",
  "explorer.shell.eyebrow",
] as const;

const explorerExampleI18nKeys = explorerExamples.flatMap(readExplorerExampleI18nKeys);

export const explorerUiI18nSchema = z.object(
  stringSchemaForKeys([...staticExplorerUiI18nKeys, ...explorerExampleI18nKeys]),
);

export type ExplorerUiStrings = z.infer<typeof explorerUiI18nSchema>;

type ExplorerExampleI18nKey =
  | ExplorerExampleDefinition["descriptionKey"]
  | ExplorerExampleDefinition["guideKeys"][number]
  | ExplorerExampleDefinition["titleKey"];

function readExplorerExampleI18nKeys(
  example: ExplorerExampleDefinition,
): readonly ExplorerExampleI18nKey[] {
  return [example.descriptionKey, ...example.guideKeys, example.titleKey];
}

function stringSchemaForKeys<const Keys extends readonly string[]>(
  keys: Keys,
): Record<Keys[number], z.ZodString> {
  return Object.fromEntries(keys.map((key) => [key, z.string()])) as Record<
    Keys[number],
    z.ZodString
  >;
}
