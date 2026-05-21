import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import {
  callerNode,
  coordinatorNode,
  scopeNode,
  spawnLink,
  waitLink,
  workerNode,
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
        createProgram: () => scopeOwnedWorkDemo,
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
    spawnLink("root", "commit", "branch(commitArticle)", ["launch-scope"]),
    spawnLink("commit", "index", "spawn(updateSearchIndex)", ["launch-index"]),
    waitLink("index", "commit", "owned process", {
      activeEvents: ["scope-wait-index"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
    waitLink("commit", "root", "branch waits for child scope", {
      activeEvents: ["scope-wait-root"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
  ];
}

function createScopeOwnedWorkFlowNodes(): ExplorerFlow<ScopeOwnedWorkDemoEvent>["nodes"] {
  return [
    callerNode("root", "publishArticle", {
      activeEvents: [
        "function-open",
        "branch-open",
        "launch-scope",
        "scope-wait-root",
        "branch-close",
        "return-result",
        "done",
      ],
      completedEvents: ["done"],
    }),
    scopeNode("commit-scope", "commitArticle scope", ["commit", "index"], {
      activeEvents: [
        "launch-scope",
        "launch-index",
        "spawn-index",
        "inner-return",
        "scope-wait-index",
        "scope-wait-root",
      ],
      closedEvents: ["branch-close"],
      completedEvents: ["branch-close"],
    }),
    coordinatorNode(
      "commit",
      "commitArticle",
      {
        activeEvents: ["launch-scope", "launch-index", "spawn-index", "inner-return"],
        completedEvents: ["inner-return"],
      },
    ),
    workerNode("index", "updateSearchIndex", {
      activeEvents: ["spawn-index", "index-sleep", "index-close"],
      completedEvents: ["index-close"],
    }),
  ];
}
