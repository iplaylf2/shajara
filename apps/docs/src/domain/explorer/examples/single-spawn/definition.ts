import type {
  ExplorerExample,
  ExplorerFlowGraph,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
} from "#/domain/explorer/contract";
import type { SingleSpawnDemoEvent, SingleSpawnDemoResult } from "./runtime";
import { createSingleSpawnDemoCode, singleSpawnDemo } from "./runtime";

export const singleSpawnExample = {
  descriptionKey: "explorer.examples.single-spawn.description",
  guideKeys: [
    "explorer.examples.single-spawn.guide.spawn",
    "explorer.examples.single-spawn.guide.parent",
  ],
  id: "single-spawn",
  stage: {
    code: createSingleSpawnDemoCode(),
    flow: createSingleSpawnFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => singleSpawnDemo,
      },
    },
  },
  titleKey: "explorer.examples.single-spawn.title",
} as const satisfies ExplorerExample<SingleSpawnDemoEvent, SingleSpawnDemoResult, string>;

function createSingleSpawnFlow(): ExplorerFlowGraph<SingleSpawnDemoEvent> {
  return {
    links: createSingleSpawnFlowLinks(),
    nodes: createSingleSpawnFlowNodes(),
  };
}

function createSingleSpawnFlowLinks(): readonly ExplorerFlowGraphLink<SingleSpawnDemoEvent>[] {
  return [
    {
      activeEvents: ["spawn-receipt"],
      from: "root",
      kind: "spawn",
      label: "spawn(sendReceiptEmail)",
      to: "receipt",
    },
  ];
}

function createSingleSpawnFlowNodes(): readonly ExplorerFlowGraphNode<SingleSpawnDemoEvent>[] {
  return [
    {
      activeEvents: ["routine", "spawn-receipt", "return-accepted", "done"],
      completedEvents: ["done"],
      id: "root",
      kind: "parent",
      label: "submitOrder",
      statusRoutineIds: ["root"],
    },
    {
      activeEvents: ["spawn-receipt", "receipt-sleep", "receipt-return"],
      completedEvents: ["receipt-return"],
      id: "receipt",
      kind: "branch",
      label: "sendReceiptEmail",
      statusRoutineIds: ["receipt"],
    },
  ];
}
