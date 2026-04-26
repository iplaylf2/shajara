import { z } from "astro/zod";

export const explorerUiI18nSchema = z.object(
  stringSchemaForKeys([
    "docs.404.body",
    "docs.404.description",
    "docs.404.hero.backHome",
    "docs.404.hero.explorer",
    "docs.404.hero.tagline",
    "docs.404.title",
    "docs.home.body",
    "docs.home.description",
    "docs.home.hero.explorer",
    "docs.home.hero.guides",
    "docs.home.hero.tagline",
    "docs.home.title",
    "explorer.areas.dependencies.description",
    "explorer.areas.dependencies.title",
    "explorer.areas.states.description",
    "explorer.areas.states.title",
    "explorer.areas.timeline.description",
    "explorer.areas.timeline.title",
    "explorer.examples.fork-join.description",
    "explorer.examples.fork-join.guide.fork",
    "explorer.examples.fork-join.guide.join",
    "explorer.examples.fork-join.title",
    "explorer.examples.future-settlement.description",
    "explorer.examples.future-settlement.guide.settle",
    "explorer.examples.future-settlement.guide.wait",
    "explorer.examples.future-settlement.title",
    "explorer.examples.single-spawn.description",
    "explorer.examples.single-spawn.guide.parent",
    "explorer.examples.single-spawn.guide.spawn",
    "explorer.examples.single-spawn.title",
    "explorer.home.intro",
    "explorer.home.title",
    "explorer.note.body",
    "explorer.note.label",
    "explorer.replay.follow",
    "explorer.replay.manual",
    "explorer.shell.backToDocs",
    "explorer.shell.eyebrow",
  ]),
);

export type ExplorerUiStrings = z.infer<typeof explorerUiI18nSchema>;

function stringSchemaForKeys<const Keys extends readonly string[]>(
  keys: Keys,
): Record<Keys[number], z.ZodString> {
  return Object.fromEntries(keys.map((key) => [key, z.string()])) as Record<
    Keys[number],
    z.ZodString
  >;
}
