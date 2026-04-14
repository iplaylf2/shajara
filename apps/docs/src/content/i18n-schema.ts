import { z } from "astro/zod";

export const explorerUiI18nFields = {
  "explorer.areas.dependencies.description": z.string().optional(),
  "explorer.areas.dependencies.title": z.string().optional(),
  "explorer.areas.states.description": z.string().optional(),
  "explorer.areas.states.title": z.string().optional(),
  "explorer.areas.timeline.description": z.string().optional(),
  "explorer.areas.timeline.title": z.string().optional(),
  "explorer.home.intro": z.string().optional(),
  "explorer.home.title": z.string().optional(),
  "explorer.note.body": z.string().optional(),
  "explorer.note.label": z.string().optional(),
  "explorer.shell.backToDocs": z.string().optional(),
  "explorer.shell.eyebrow": z.string().optional(),
} as const;

export const explorerUiI18nSchema = z.object(explorerUiI18nFields);

export type ExplorerUiStringKey = keyof typeof explorerUiI18nFields;
export type ExplorerUiStrings = Record<ExplorerUiStringKey, string>;
