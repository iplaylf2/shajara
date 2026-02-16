import type { ExampleScenarioName } from "./scenarios";
import { getExampleScenario } from "./scenarios";
import { run } from "@khora/runtime";

interface ExampleAppOptions {
  readonly execute: boolean;
  readonly scenario: ExampleScenarioName;
}

const DEFAULT_EXAMPLE_APP_OPTIONS: ExampleAppOptions = {
  execute: false,
  scenario: "run",
};

function startExampleApp(
  options: ExampleAppOptions = DEFAULT_EXAMPLE_APP_OPTIONS,
): Promise<unknown> {
  if (!options.execute) {
    return Promise.resolve({ kind: "skipped" as const });
  }

  const selectedScenario = getExampleScenario(options.scenario);
  return run(selectedScenario);
}

export { DEFAULT_EXAMPLE_APP_OPTIONS, startExampleApp };
export type { ExampleAppOptions };
