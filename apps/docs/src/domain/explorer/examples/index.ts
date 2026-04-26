import type { ArrayValues } from "type-fest";
import { forkJoinExample } from "./fork-join";
import { futureSettlementExample } from "./future-settlement";
import { singleSpawnExample } from "./single-spawn";

export function readExplorerExample(exampleId: ExplorerExampleId): ExplorerExampleDefinition {
  return explorerExampleDefinitions[exampleId];
}

export function readExplorerReplayRuntime(exampleId: ExplorerExampleId): ExplorerReplayRuntime {
  return readExplorerExample(exampleId).stage.replay.runtime;
}

export const explorerExamples = [
  singleSpawnExample,
  futureSettlementExample,
  forkJoinExample,
] as const;
export const DEFAULT_EXPLORER_EXAMPLE_ID = singleSpawnExample.id;

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
  [futureSettlementExample.id]: futureSettlementExample,
  [forkJoinExample.id]: forkJoinExample,
  [singleSpawnExample.id]: singleSpawnExample,
};
