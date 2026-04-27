import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  dependencyLink,
  parentRoutineNode,
  spawnLink,
} from "#/domain/explorer/examples-kit";
import { createScopeBoundaryDemoCode, scopeBoundaryDemo } from "./runtime";
import type { ScopeBoundaryDemoEvent } from "./runtime";

export const scopeBoundaryExample = {
  descriptionKey: "explorer.examples.scope-boundary.description",
  guideKeys: [
    "explorer.examples.scope-boundary.guide.enclose",
    "explorer.examples.scope-boundary.guide.scope",
    "explorer.examples.scope-boundary.guide.spawn",
  ],
  id: "scope-boundary",
  stage: {
    code: createScopeBoundaryDemoCode(),
    flow: createScopeBoundaryFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => scopeBoundaryDemo,
      },
    },
  },
  titleKey: "explorer.examples.scope-boundary.title",
} as const satisfies ExplorerExample<ScopeBoundaryDemoEvent, string, string>;

function createScopeBoundaryFlow(): ExplorerFlowGraph<ScopeBoundaryDemoEvent> {
  return {
    links: createScopeBoundaryFlowLinks(),
    nodes: createScopeBoundaryFlowNodes(),
  };
}

function createScopeBoundaryFlowLinks(): ExplorerFlowGraph<ScopeBoundaryDemoEvent>["links"] {
  return [
    spawnLink("root", "index", "enclose -> spawn(updateSearchIndex)", ["spawn-index"]),
    dependencyLink("index", "root", "enclose waits for owned process", {
      activeEvents: ["scope-wait"],
      visibleLabel: "owned",
    }),
  ];
}

function createScopeBoundaryFlowNodes(): ExplorerFlowGraph<ScopeBoundaryDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "publishArticle", {
      activeEvents: [
        "routine",
        "enclose-open",
        "scope-wait",
        "enclose-close",
        "return-result",
        "done",
      ],
      completedEvents: ["done"],
    }),
    branchRoutineNode("index", "updateSearchIndex", {
      activeEvents: ["spawn-index", "index-sleep", "enclose-close", "index-close"],
      completedEvents: ["index-close"],
    }),
  ];
}
