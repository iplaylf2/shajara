import type { ArrayValues } from "type-fest";
import { forkJoinExample } from "./fork-join";

export function readExplorerExample(exampleId: ExplorerExampleId): ExplorerExampleDefinition {
  return explorerExampleDefinitions[exampleId];
}

export function readExplorerReplayRuntime(exampleId: ExplorerExampleId): ExplorerReplayRuntime {
  return readExplorerExample(exampleId).stage.replay.runtime;
}

export const explorerExamples = [forkJoinExample] as const;
export const DEFAULT_EXPLORER_EXAMPLE_ID = forkJoinExample.id;

export type ExplorerExampleDefinition = ArrayValues<typeof explorerExamples>;
export type ExplorerExampleId = ExplorerExampleDefinition["id"];
export type ExplorerExampleEvent = ExplorerExampleDefinition["stage"]["code"][number]["id"];
export type ExplorerReplayRuntime = ExplorerExampleDefinition["stage"]["replay"]["runtime"];

const explorerExampleDefinitions: {
  readonly [ExampleId in ExplorerExampleId]: Extract<
    ExplorerExampleDefinition,
    { readonly id: ExampleId }
  >;
} = {
  [forkJoinExample.id]: forkJoinExample,
};
