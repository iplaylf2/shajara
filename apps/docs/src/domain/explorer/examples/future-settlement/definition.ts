import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";
import { createFutureSettlementDemoCode, futureSettlementDemo } from "./runtime";
import type { FutureSettlementDemoEvent } from "./runtime";

export const futureSettlementExample = {
  descriptionKey: "explorer.examples.future-settlement.description",
  guideKeys: [
    "explorer.examples.future-settlement.guide.wait",
    "explorer.examples.future-settlement.guide.settle",
  ],
  id: "future-settlement",
  stage: {
    code: createFutureSettlementDemoCode(),
    flow: createFutureSettlementFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => futureSettlementDemo,
      },
    },
  },
  titleKey: "explorer.examples.future-settlement.title",
} as const satisfies ExplorerExample<FutureSettlementDemoEvent, string, string>;

function createFutureSettlementFlow(): ExplorerFlow<FutureSettlementDemoEvent> {
  return {
    links: createFutureSettlementFlowLinks(),
    nodes: createFutureSettlementFlowNodes(),
  };
}

function createFutureSettlementFlowLinks(): ExplorerFlow<FutureSettlementDemoEvent>["links"] {
  return [
    spawnLink("root", "resolver", "spawn(receiveSmsCode)", ["spawn-resolver"]),
    waitLink("resolver", "root", "smsCode", {
      activeEvents: ["wait-code"],
      displayLabel: { kind: "visible", text: "smsCode" },
      interruption: { kind: "none" },
    }),
  ];
}

function createFutureSettlementFlowNodes(): ExplorerFlow<FutureSettlementDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "verifyPhoneNumber", {
      activeEvents: ["routine", "future", "spawn-resolver", "wait-code", "done"],
      completedEvents: ["done"],
    }),
    branchRoutineNode("resolver", "receiveSmsCode", {
      activeEvents: ["spawn-resolver", "resolver-sleep", "settle-code"],
      completedEvents: ["settle-code"],
    }),
  ];
}
