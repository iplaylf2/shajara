import type { ArrayValues } from "type-fest";
import { allResultsExample } from "./all-results";
import { boundedChannelExample } from "./bounded-channel";
import { failureDrivenCancellationExample } from "./failure-driven-cancellation";
import { firstResultExample } from "./first-result";
import { forkJoinExample } from "./fork-join";
import { futureSettlementExample } from "./future-settlement";
import { scopeManagedObjectsExample } from "./scope-managed-objects";
import { scopeOwnedWorkExample } from "./scope-owned-work";
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
  scopeOwnedWorkExample,
  forkJoinExample,
  allResultsExample,
  firstResultExample,
  boundedChannelExample,
  scopeManagedObjectsExample,
  failureDrivenCancellationExample,
] as const;

const [defaultExplorerExample] = explorerExamples;

export const DEFAULT_EXPLORER_EXAMPLE_ID = defaultExplorerExample.id;

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

type ExplorerExampleDefinitions = {
  readonly [ExampleId in ExplorerExampleId]: Extract<
    ExplorerExampleDefinition,
    { readonly id: ExampleId }
  >;
};

const explorerExampleDefinitions = Object.fromEntries(
  explorerExamples.map((exampleDefinition) => [exampleDefinition.id, exampleDefinition]),
) as ExplorerExampleDefinitions;
