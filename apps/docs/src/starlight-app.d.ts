export type StarlightAppI18nModule = never;

declare global {
  namespace StarlightApp {
    interface I18n {
      "demo.counter.button": string;
      "demo.counter.countLabel": string;
      "demo.home.intro": string;
      "demo.home.title": string;
      "demo.shell.backToDocs": string;
      "demo.shell.eyebrow": string;
    }
  }
}
