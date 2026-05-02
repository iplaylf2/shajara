import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  callerNode,
  dataLink,
  futureNode,
  spawnLink,
  waitLink,
  workerNode,
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
        createProgram: () => futureSettlementDemo,
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
    dataLink("resolver", "sms-code", "settle smsCode", ["settle-code"]),
    waitLink("sms-code", "root", "wait(smsCode)", {
      activeEvents: ["wait-code"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
  ];
}

function createFutureSettlementFlowNodes(): ExplorerFlow<FutureSettlementDemoEvent>["nodes"] {
  return [
    callerNode("root", "verifyPhoneNumber", {
      activeEvents: ["function-open", "future", "spawn-resolver", "wait-code", "done"],
      completedEvents: ["done"],
    }),
    workerNode("resolver", "receiveSmsCode", {
      activeEvents: ["spawn-resolver", "resolver-sleep", "settle-code"],
      completedEvents: ["settle-code"],
    }),
    futureNode("sms-code", "smsCode", {
      activeEvents: ["future", "wait-code"],
      completedEvents: ["settle-code"],
    }),
  ];
}
