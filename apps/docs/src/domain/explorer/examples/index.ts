import type { ArrayValues } from "type-fest";
import { allResultsExample } from "./all-results";
import { boundedChannelExample } from "./bounded-channel";
import { firstResultExample } from "./first-result";
import { forkJoinExample } from "./fork-join";
import { futureSettlementExample } from "./future-settlement";
import { scopeOwnershipExample } from "./scope-ownership";
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
  scopeOwnershipExample,
  forkJoinExample,
  allResultsExample,
  firstResultExample,
  boundedChannelExample,
] as const;
export const DEFAULT_EXPLORER_EXAMPLE_ID = singleSpawnExample.id;

export type ExplorerExampleDefinition = ArrayValues<typeof explorerExamples>;
export type ExplorerExampleId = ExplorerExampleDefinition["id"];
export type ExplorerExampleEvent =
  ExplorerExampleDefinition extends ExampleWithEvent<infer Event> ? Event : never;
export type ExplorerReplayRuntime = ExplorerExampleDefinition["stage"]["replay"]["runtime"];

interface ExampleWithEvent<Event extends string> {
  readonly stage: {
    readonly flow: {
      readonly links: readonly {
        readonly activeEvents: readonly Event[];
      }[];
      readonly nodes: readonly {
        readonly activeEvents: readonly Event[];
        readonly completedEvents: readonly Event[];
      }[];
    };
  };
}

const explorerExampleDefinitions: {
  readonly [ExampleId in ExplorerExampleId]: Extract<
    ExplorerExampleDefinition,
    { readonly id: ExampleId }
  >;
} = {
  [allResultsExample.id]: allResultsExample,
  [boundedChannelExample.id]: boundedChannelExample,
  [futureSettlementExample.id]: futureSettlementExample,
  [forkJoinExample.id]: forkJoinExample,
  [firstResultExample.id]: firstResultExample,
  [scopeOwnershipExample.id]: scopeOwnershipExample,
  [singleSpawnExample.id]: singleSpawnExample,
};
