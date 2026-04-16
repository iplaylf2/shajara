import { z } from "astro/zod";

export const explorerUiI18nFields = {
  "docs.404.body": z.string(),
  "docs.404.description": z.string(),
  "docs.404.hero.backHome": z.string(),
  "docs.404.hero.explorer": z.string(),
  "docs.404.hero.tagline": z.string(),
  "docs.404.title": z.string(),
  "docs.home.body": z.string(),
  "docs.home.description": z.string(),
  "docs.home.hero.explorer": z.string(),
  "docs.home.hero.guides": z.string(),
  "docs.home.hero.tagline": z.string(),
  "docs.home.title": z.string(),
  "explorer.areas.dependencies.description": z.string(),
  "explorer.areas.dependencies.title": z.string(),
  "explorer.areas.states.description": z.string(),
  "explorer.areas.states.title": z.string(),
  "explorer.areas.timeline.description": z.string(),
  "explorer.areas.timeline.title": z.string(),
  "explorer.examples.host-concurrency.description": z.string(),
  "explorer.examples.host-concurrency.guide.scope": z.string(),
  "explorer.examples.host-concurrency.guide.spawn": z.string(),
  "explorer.examples.host-concurrency.guide.wait": z.string(),
  "explorer.examples.host-concurrency.title": z.string(),
  "explorer.home.intro": z.string(),
  "explorer.home.title": z.string(),
  "explorer.note.body": z.string(),
  "explorer.note.label": z.string(),
  "explorer.shell.backToDocs": z.string(),
  "explorer.shell.eyebrow": z.string(),
} as const;

export const explorerUiI18nSchema = z.object(explorerUiI18nFields);

export type ExplorerUiStringKey = keyof typeof explorerUiI18nFields;
export type ExplorerUiStrings = Record<ExplorerUiStringKey, string>;
