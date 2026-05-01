import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  branchRoutineNode,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";
import { createScopeOwnedWorkDemoCode, scopeOwnedWorkDemo } from "./runtime";
import type { ScopeOwnedWorkDemoEvent } from "./runtime";

export const scopeOwnedWorkExample = {
  descriptionKey: "explorer.examples.scope-owned-work.description",
  guideKeys: [
    "explorer.examples.scope-owned-work.guide.branch",
    "explorer.examples.scope-owned-work.guide.scope",
    "explorer.examples.scope-owned-work.guide.result",
    "explorer.examples.scope-owned-work.guide.wait",
  ],
  id: "scope-owned-work",
  stage: {
    code: createScopeOwnedWorkDemoCode(),
    flow: createScopeOwnedWorkFlow(),
    replay: {
      replayDelayMs: 1200,
      runtime: {
        createRoutine: () => scopeOwnedWorkDemo,
      },
    },
  },
  titleKey: "explorer.examples.scope-owned-work.title",
} as const satisfies ExplorerExample<ScopeOwnedWorkDemoEvent, string, string>;

function createScopeOwnedWorkFlow(): ExplorerFlow<ScopeOwnedWorkDemoEvent> {
  return {
    links: createScopeOwnedWorkFlowLinks(),
    nodes: createScopeOwnedWorkFlowNodes(),
  };
}

function createScopeOwnedWorkFlowLinks(): ExplorerFlow<ScopeOwnedWorkDemoEvent>["links"] {
  return [
    spawnLink("root", "scope", "branch(commitArticle)", ["launch-scope"]),
    spawnLink("scope", "index", "spawn(updateSearchIndex)", ["launch-index"]),
    waitLink("index", "scope", "owned process", {
      activeEvents: ["scope-wait-index"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
    waitLink("scope", "root", "branch waits for child scope", {
      activeEvents: ["scope-wait-root"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
  ];
}

function createScopeOwnedWorkFlowNodes(): ExplorerFlow<ScopeOwnedWorkDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "publishArticle", {
      activeEvents: [
        "routine",
        "branch-open",
        "launch-scope",
        "scope-wait-root",
        "branch-close",
        "return-result",
        "done",
      ],
      completedEvents: ["done"],
    }),
    {
      activeEvents: [
        "launch-scope",
        "launch-index",
        "spawn-index",
        "inner-return",
        "scope-wait-index",
        "branch-close",
      ],
      completedEvents: ["branch-close"],
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
