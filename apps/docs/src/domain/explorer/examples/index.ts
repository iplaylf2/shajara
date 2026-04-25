import type { ArrayValues } from "type-fest";
import { forkJoinExample } from "./fork-join";

export function readExplorerExample(exampleId: ExplorerExampleId): ExplorerExampleDefinition {
  return EXPLORER_EXAMPLE_DEFINITIONS[exampleId];
}

export function readExplorerReplayRuntime(exampleId: ExplorerExampleId): ExplorerReplayRuntime {
  return readExplorerExample(exampleId).stage.replay.runtime;
}

export const EXPLORER_EXAMPLES = [forkJoinExample] as const;
export const DEFAULT_EXPLORER_EXAMPLE_ID = forkJoinExample.id;

export type ExplorerExampleDefinition = ArrayValues<typeof EXPLORER_EXAMPLES>;
export type ExplorerExampleId = ExplorerExampleDefinition["id"];
export type ExplorerExampleEvent = ExplorerExampleDefinition["stage"]["code"][number]["id"];
export type ExplorerReplayRuntime = ExplorerExampleDefinition["stage"]["replay"]["runtime"];

const EXPLORER_EXAMPLE_DEFINITIONS: {
  readonly [ExampleId in ExplorerExampleId]: Extract<
    ExplorerExampleDefinition,
    { readonly id: ExampleId }
  >;
} = {
  [forkJoinExample.id]: forkJoinExample,
};
