import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import { callerNode, spawnLink, waitLink, workerNode } from "#/domain/explorer/examples-kit";
import { createSingleSpawnDemoCode, singleSpawnDemo } from "./runtime";
import type { SingleSpawnDemoEvent } from "./runtime";

export const singleSpawnExample = {
  descriptionKey: "explorer.examples.single-spawn.description",
  guideKeys: [
    "explorer.examples.single-spawn.guide.spawn",
    "explorer.examples.single-spawn.guide.caller",
  ],
  id: "single-spawn",
  stage: {
    code: createSingleSpawnDemoCode(),
    flow: createSingleSpawnFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createProgram: () => singleSpawnDemo,
      },
    },
  },
  titleKey: "explorer.examples.single-spawn.title",
} as const satisfies ExplorerExample<SingleSpawnDemoEvent, string, string>;

function createSingleSpawnFlow(): ExplorerFlow<SingleSpawnDemoEvent> {
  return {
    links: createSingleSpawnFlowLinks(),
    nodes: createSingleSpawnFlowNodes(),
  };
}

function createSingleSpawnFlowLinks(): ExplorerFlow<SingleSpawnDemoEvent>["links"] {
  return [
    spawnLink("root", "receipt", "spawn(sendReceiptEmail)", ["spawn-receipt"]),
    waitLink("receipt", "root", "scope waits for sendReceiptEmail", {
      activeEvents: ["wait-receipt"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
  ];
}

function createSingleSpawnFlowNodes(): ExplorerFlow<SingleSpawnDemoEvent>["nodes"] {
  return [
    callerNode("root", "submitOrder", {
      activeEvents: ["function-open", "spawn-receipt", "return-accepted", "wait-receipt", "done"],
      completedEvents: ["done"],
    }),
    workerNode("receipt", "sendReceiptEmail", {
      activeEvents: ["spawn-receipt", "receipt-sleep", "receipt-return"],
      completedEvents: ["receipt-return"],
    }),
  ];
}
