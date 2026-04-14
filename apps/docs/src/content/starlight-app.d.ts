import type { ExplorerUiStrings } from "./i18n-schema";

export type StarlightAppI18nModule = ExplorerUiStrings;

declare global {
  namespace StarlightApp {
    interface I18n extends ExplorerUiStrings {
      [starlightAppI18nTypeBrand]?: never;
    }
  }
}

declare const starlightAppI18nTypeBrand: unique symbol;
