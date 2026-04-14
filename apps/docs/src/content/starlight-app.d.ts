import type { DemoUiStrings } from "./i18n-schema";

export type StarlightAppI18nModule = DemoUiStrings;

declare global {
  namespace StarlightApp {
    interface I18n extends DemoUiStrings {
      [starlightAppI18nTypeBrand]?: never;
    }
  }
}

declare const starlightAppI18nTypeBrand: unique symbol;
