import { z } from "astro/zod";

export const explorerUiI18nFields = {
  "explorer.areas.dependencies.description": z.string(),
  "explorer.areas.dependencies.title": z.string(),
  "explorer.areas.states.description": z.string(),
  "explorer.areas.states.title": z.string(),
  "explorer.areas.timeline.description": z.string(),
  "explorer.areas.timeline.title": z.string(),
  "explorer.code.placeholder": z.string(),
  "explorer.examples.example-a.description": z.string(),
  "explorer.examples.example-a.title": z.string(),
  "explorer.examples.example-b.description": z.string(),
  "explorer.examples.example-b.title": z.string(),
  "explorer.examples.example-c.description": z.string(),
  "explorer.examples.example-c.title": z.string(),
  "explorer.home.intro": z.string(),
  "explorer.home.title": z.string(),
  "explorer.note.body": z.string(),
  "explorer.note.label": z.string(),
  "explorer.shell.backToDocs": z.string(),
  "explorer.shell.eyebrow": z.string(),
  "explorer.shell.languageLabel": z.string(),
  "explorer.stage.placeholder": z.string(),
} as const;

export const explorerUiI18nSchema = z.object(explorerUiI18nFields);

export type ExplorerUiStringKey = keyof typeof explorerUiI18nFields;
export type ExplorerUiStrings = Record<ExplorerUiStringKey, string>;
