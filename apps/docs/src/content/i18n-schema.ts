import { z } from "astro/zod";

export const demoUiI18nFields = {
  "demo.counter.button": z.string().optional(),
  "demo.counter.countLabel": z.string().optional(),
  "demo.home.intro": z.string().optional(),
  "demo.home.title": z.string().optional(),
  "demo.shell.backToDocs": z.string().optional(),
  "demo.shell.eyebrow": z.string().optional(),
} as const;

export const demoUiI18nSchema = z.object(demoUiI18nFields);

export type DemoUiStringKey = keyof typeof demoUiI18nFields;
export type DemoUiStrings = Record<DemoUiStringKey, string>;
