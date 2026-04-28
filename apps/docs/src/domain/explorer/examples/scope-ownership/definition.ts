import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";
import { createScopeOwnershipDemoCode, scopeOwnershipDemo } from "./runtime";
import type { ScopeOwnershipDemoEvent } from "./runtime";

export const scopeOwnershipExample = {
  descriptionKey: "explorer.examples.scope-ownership.description",
  guideKeys: [
    "explorer.examples.scope-ownership.guide.enclose",
    "explorer.examples.scope-ownership.guide.scope",
    "explorer.examples.scope-ownership.guide.spawn",
  ],
  id: "scope-ownership",
  stage: {
    code: createScopeOwnershipDemoCode(),
    flow: createScopeOwnershipFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => scopeOwnershipDemo,
      },
    },
  },
  titleKey: "explorer.examples.scope-ownership.title",
} as const satisfies ExplorerExample<ScopeOwnershipDemoEvent, string, string>;

function createScopeOwnershipFlow(): ExplorerFlowGraph<ScopeOwnershipDemoEvent> {
  return {
    links: createScopeOwnershipFlowLinks(),
    nodes: createScopeOwnershipFlowNodes(),
  };
}

function createScopeOwnershipFlowLinks(): ExplorerFlowGraph<ScopeOwnershipDemoEvent>["links"] {
  return [
    spawnLink("root", "scope", "enclose(commitArticle)", ["launch-scope"]),
    spawnLink("scope", "index", "spawn(updateSearchIndex)", ["launch-index"]),
    waitLink("index", "scope", "owned process", {
      activeEvents: ["scope-wait-index"],
    }),
    waitLink("scope", "root", "enclose waits for child scope", {
      activeEvents: ["scope-wait-root"],
    }),
  ];
}

function createScopeOwnershipFlowNodes(): ExplorerFlowGraph<ScopeOwnershipDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "publishArticle", {
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
        "enclose-open",
        "launch-scope",
        "launch-index",
        "spawn-index",
        "inner-return",
        "scope-wait-index",
        "scope-wait-root",
        "enclose-close",
      ],
      completedEvents: ["enclose-close"],
      id: "scope",
      kind: "join",
      label: "commitArticle",
      statusRoutineIds: ["scope", "root"],
    },
    branchRoutineNode("index", "updateSearchIndex", {
      activeEvents: ["spawn-index", "index-sleep", "scope-wait-index", "index-close"],
      completedEvents: ["index-close"],
    }),
  ];
}
