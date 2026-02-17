import { createScope, run } from "@khora/runtime";
import type { ExampleScenarioName } from "./scenarios";
import { getExampleScenario } from "./scenarios";

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

async function runInManagedScope(
  selectedScenario: ReturnType<typeof getExampleScenario>,
): Promise<unknown> {
  await using scope = createScope();
  return await scope.run(selectedScenario);
}

function startExampleAppWithManagedScope(
  options: ExampleAppOptions = DEFAULT_EXAMPLE_APP_OPTIONS,
): Promise<unknown> {
  if (!options.execute) {
    return Promise.resolve({ kind: "skipped" as const });
  }

  const selectedScenario = getExampleScenario(options.scenario);
  return runInManagedScope(selectedScenario);
}

export { DEFAULT_EXAMPLE_APP_OPTIONS, startExampleApp, startExampleAppWithManagedScope };
export type { ExampleAppOptions };
