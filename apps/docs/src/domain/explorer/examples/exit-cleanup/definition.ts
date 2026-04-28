import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  dataLink,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";
import { createExitCleanupDemoCode, exitCleanupDemo } from "./runtime";
import type { ExitCleanupDemoEvent } from "./runtime";

export const exitCleanupExample = {
  descriptionKey: "explorer.examples.exit-cleanup.description",
  guideKeys: [
    "explorer.examples.exit-cleanup.guide.defer",
    "explorer.examples.exit-cleanup.guide.close",
    "explorer.examples.exit-cleanup.guide.result",
  ],
  id: "exit-cleanup",
  stage: {
    code: createExitCleanupDemoCode(),
    flow: createExitCleanupFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => exitCleanupDemo,
      },
    },
  },
  titleKey: "explorer.examples.exit-cleanup.title",
} as const satisfies ExplorerExample<ExitCleanupDemoEvent, string, string>;

function createExitCleanupFlow(): ExplorerFlow<ExitCleanupDemoEvent> {
  return {
    links: createExitCleanupFlowLinks(),
    nodes: createExitCleanupFlowNodes(),
  };
}

function createExitCleanupFlowLinks(): ExplorerFlow<ExitCleanupDemoEvent>["links"] {
  return [
    spawnLink("root", "scope", "enclose(packParcel)", ["launch-scope"]),
    dataLink("scope", "defer", "defer(releaseBench)", ["defer-open"]),
    waitLink("defer", "scope", "deferred cleanup", {
      activeEvents: ["scope-wait-defer"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
    waitLink("scope", "root", "enclose waits for scope", {
      activeEvents: ["scope-wait-root"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
  ];
}

function createExitCleanupFlowNodes(): ExplorerFlow<ExitCleanupDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "shipOrder", {
      activeEvents: [
        "routine",
        "enclose-open",
        "launch-scope",
        "scope-wait-root",
        "enclose-close",
        "return-result",
        "done",
      ],
      completedEvents: ["done"],
    }),
    {
      activeEvents: [
        "launch-scope",
        "defer-open",
        "defer-registered",
        "pack-sleep",
        "inner-return",
        "scope-wait-defer",
        "enclose-close",
      ],
      completedEvents: ["enclose-close"],
      id: "scope",
      kind: "join",
      label: "packParcel",
      statusRoutineIds: ["scope", "root"],
    },
    branchRoutineNode("defer", "releaseBench", {
      activeEvents: [
        "defer-open",
        "defer-registered",
        "defer-sleep",
        "scope-wait-defer",
        "defer-cleaned",
      ],
      completedEvents: ["defer-cleaned"],
    }),
  ];
}
