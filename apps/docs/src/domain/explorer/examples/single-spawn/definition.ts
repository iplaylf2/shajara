import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import { branchRoutineNode, parentRoutineNode, spawnLink } from "#/domain/explorer/examples-kit";
import { createSingleSpawnDemoCode, singleSpawnDemo } from "./runtime";
import type { SingleSpawnDemoEvent } from "./runtime";

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
} as const satisfies ExplorerExample<SingleSpawnDemoEvent, string, string>;

function createSingleSpawnFlow(): ExplorerFlowGraph<SingleSpawnDemoEvent> {
  return {
    links: createSingleSpawnFlowLinks(),
    nodes: createSingleSpawnFlowNodes(),
  };
}

function createSingleSpawnFlowLinks(): ExplorerFlowGraph<SingleSpawnDemoEvent>["links"] {
  return [spawnLink("root", "receipt", "spawn(sendReceiptEmail)", ["spawn-receipt"])];
}

function createSingleSpawnFlowNodes(): ExplorerFlowGraph<SingleSpawnDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "submitOrder", {
      activeEvents: ["routine", "spawn-receipt", "return-accepted", "done"],
      completedEvents: ["done"],
    }),
    branchRoutineNode("receipt", "sendReceiptEmail", {
      activeEvents: ["spawn-receipt", "receipt-sleep", "receipt-return"],
      completedEvents: ["receipt-return"],
    }),
  ];
}
