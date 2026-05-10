import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  callerNode,
  coordinatorNode,
  scopeNode,
  spawnLink,
  waitLink,
  workerNode,
} from "#/domain/explorer/examples-kit";
import { createRecoveryBoundaryDemoCode, recoveryBoundaryDemo } from "./runtime";
import type { RecoveryBoundaryDemoEvent } from "./runtime";

export const recoveryBoundaryExample = {
  descriptionKey: "explorer.examples.recovery-boundary.description",
  guideKeys: [
    "explorer.examples.recovery-boundary.guide.boundary",
    "explorer.examples.recovery-boundary.guide.failure",
    "explorer.examples.recovery-boundary.guide.recovery",
    "explorer.examples.recovery-boundary.guide.resume",
  ],
  id: "recovery-boundary",
  stage: {
    code: createRecoveryBoundaryDemoCode(),
    flow: createRecoveryBoundaryFlow(),
    replay: {
      replayDelayMs: 1300,
      runtime: {
        createProgram: () => recoveryBoundaryDemo,
      },
    },
  },
  titleKey: "explorer.examples.recovery-boundary.title",
} as const satisfies ExplorerExample<RecoveryBoundaryDemoEvent, void, string>;

function createRecoveryBoundaryFlow(): ExplorerFlow<RecoveryBoundaryDemoEvent> {
  return {
    links: createRecoveryBoundaryFlowLinks(),
    nodes: createRecoveryBoundaryFlowNodes(),
  };
}

function createRecoveryBoundaryFlowLinks(): ExplorerFlow<RecoveryBoundaryDemoEvent>["links"] {
  return [
    spawnLink("root", "review", "guard(reviewListing)", ["launch-guard"]),
    spawnLink("review", "scan", "resumable(scanPhotos)", ["launch-scan"]),
    waitLink("approval", "scan", "recovery value", {
      activeEvents: ["request-recovery", "handler-sleep", "handler-return", "apply-recovery"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
    waitLink("scan", "review", "resumable value", {
      activeEvents: ["resumable-wait"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
  ];
}

function createRecoveryBoundaryFlowNodes(): ExplorerFlow<RecoveryBoundaryDemoEvent>["nodes"] {
  return [
    createRootNode(),
    createGuardScopeNode(),
    createReviewNode(),
    createScanNode(),
    createApprovalNode(),
  ];
}

function createRootNode(): ExplorerFlow<RecoveryBoundaryDemoEvent>["nodes"][number] {
  return callerNode("root", "publishListing", {
    activeEvents: ["function-open", "guard-open", "launch-guard", "guard-wait-root", "done"],
    completedEvents: ["done"],
  });
}

function createGuardScopeNode(): ExplorerFlow<RecoveryBoundaryDemoEvent>["nodes"][number] {
  return scopeNode("guard-scope", "guard boundary", ["review", "scan", "approval"], {
    activeEvents: [
      "launch-guard",
      "launch-scan",
      "resumable-wait",
      "scan-sleep",
      "scan-throw",
      "request-recovery",
      "handler-sleep",
      "handler-return",
      "apply-recovery",
      "entry-apply",
      "guard-wait-root",
    ],
    closedEvents: ["guard-closed"],
    closingEvents: ["guard-closing"],
    completedEvents: ["guard-closed"],
  });
}

function createReviewNode(): ExplorerFlow<RecoveryBoundaryDemoEvent>["nodes"][number] {
  return coordinatorNode("review", "reviewListing", {
    activeEvents: [
      "launch-guard",
      "resumable-open",
      "launch-scan",
      "resumable-wait",
      "entry-apply",
    ],
    completedEvents: ["entry-apply"],
  });
}

function createScanNode(): ExplorerFlow<RecoveryBoundaryDemoEvent>["nodes"][number] {
  return workerNode("scan", "scanPhotos", {
    activeEvents: ["launch-scan", "scan-sleep", "scan-throw", "request-recovery"],
    completedEvents: ["scan-throw"],
  });
}

function createApprovalNode(): ExplorerFlow<RecoveryBoundaryDemoEvent>["nodes"][number] {
  return coordinatorNode("approval", "approveManually", {
    activeEvents: ["request-recovery", "handler-sleep", "handler-return", "apply-recovery"],
    completedEvents: ["handler-return"],
  });
}
