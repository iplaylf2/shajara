import { DEFAULT_EXAMPLE_APP_OPTIONS, startExampleApp } from "./example-app";

function rethrow(error: unknown): never {
  throw error;
}

startExampleApp(DEFAULT_EXAMPLE_APP_OPTIONS).catch(rethrow);
