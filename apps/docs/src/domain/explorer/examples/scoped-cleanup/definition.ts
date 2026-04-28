import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  dataLink,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";
import { createScopedCleanupDemoCode, scopedCleanupDemo } from "./runtime";
import type { ScopedCleanupDemoEvent } from "./runtime";

export const scopedCleanupExample = {
  descriptionKey: "explorer.examples.scoped-cleanup.description",
  guideKeys: [
    "explorer.examples.scoped-cleanup.guide.enclose",
    "explorer.examples.scoped-cleanup.guide.defer",
    "explorer.examples.scoped-cleanup.guide.close",
  ],
  id: "scoped-cleanup",
  stage: {
    code: createScopedCleanupDemoCode(),
    flow: createScopedCleanupFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => scopedCleanupDemo,
      },
    },
  },
  titleKey: "explorer.examples.scoped-cleanup.title",
} as const satisfies ExplorerExample<ScopedCleanupDemoEvent, string, string>;

function createScopedCleanupFlow(): ExplorerFlow<ScopedCleanupDemoEvent> {
  return {
    links: createScopedCleanupFlowLinks(),
    nodes: createScopedCleanupFlowNodes(),
  };
}

function createScopedCleanupFlowLinks(): ExplorerFlow<ScopedCleanupDemoEvent>["links"] {
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

function createScopedCleanupFlowNodes(): ExplorerFlow<ScopedCleanupDemoEvent>["nodes"] {
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
