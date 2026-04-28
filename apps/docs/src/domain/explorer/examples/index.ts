import type { ArrayValues } from "type-fest";
import { allResultsExample } from "./all-results";
import { bufferedBackpressureExample } from "./buffered-backpressure";
import { firstResultExample } from "./first-result";
import { forkJoinExample } from "./fork-join";
import { futureSettlementExample } from "./future-settlement";
import { rendezvousChannelExample } from "./rendezvous-channel";
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
  rendezvousChannelExample,
  bufferedBackpressureExample,
] as const;
export const DEFAULT_EXPLORER_EXAMPLE_ID = singleSpawnExample.id;

export type ExplorerExampleDefinition = ArrayValues<typeof explorerExamples>;
export type ExplorerExampleId = ExplorerExampleDefinition["id"];
export type ExplorerExampleEvent =
  ExplorerExampleDefinition extends ExplorerExampleDefinitionWithEvent<infer Event> ? Event : never;
export type ExplorerReplayRuntime = ExplorerExampleDefinition["stage"]["replay"]["runtime"];

interface ExplorerExampleDefinitionWithEvent<Event extends string> {
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
  [bufferedBackpressureExample.id]: bufferedBackpressureExample,
  [futureSettlementExample.id]: futureSettlementExample,
  [forkJoinExample.id]: forkJoinExample,
  [firstResultExample.id]: firstResultExample,
  [rendezvousChannelExample.id]: rendezvousChannelExample,
  [scopeOwnershipExample.id]: scopeOwnershipExample,
  [singleSpawnExample.id]: singleSpawnExample,
};
