import type {
  ExplorerExample,
  ExplorerFlowGraph,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
} from "#/domain/explorer/contract";
import type { FutureSettlementDemoEvent, FutureSettlementDemoResult } from "./runtime";
import { createFutureSettlementDemoCode, futureSettlementDemo } from "./runtime";

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
} as const satisfies ExplorerExample<FutureSettlementDemoEvent, FutureSettlementDemoResult, string>;

function createFutureSettlementFlow(): ExplorerFlowGraph<FutureSettlementDemoEvent> {
  return {
    links: createFutureSettlementFlowLinks(),
    nodes: createFutureSettlementFlowNodes(),
  };
}

function createFutureSettlementFlowLinks(): readonly ExplorerFlowGraphLink<FutureSettlementDemoEvent>[] {
  return [
    {
      activeEvents: ["spawn-resolver"],
      from: "root",
      kind: "spawn",
      label: "spawn(receiveSmsCode)",
      to: "resolver",
    },
    {
      activeEvents: ["wait-code"],
      from: "resolver",
      kind: "dependency",
      label: "smsCode",
      to: "root",
      visibleLabel: "smsCode",
    },
  ];
}

function createFutureSettlementFlowNodes(): readonly ExplorerFlowGraphNode<FutureSettlementDemoEvent>[] {
  return [
    {
      activeEvents: ["routine", "future", "spawn-resolver", "wait-code", "done"],
      completedEvents: ["done"],
      id: "root",
      kind: "parent",
      label: "verifyPhoneNumber",
      statusRoutineIds: ["root"],
    },
    {
      activeEvents: ["spawn-resolver", "resolver-sleep", "settle-code"],
      completedEvents: ["settle-code"],
      id: "resolver",
      kind: "branch",
      label: "receiveSmsCode",
      statusRoutineIds: ["resolver"],
    },
  ];
}
