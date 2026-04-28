import type { AllResultsDemoEvent, AllResultsDemoResult } from "./runtime";
import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import { allResultsDemo, createAllResultsDemoCode } from "./runtime";
import {
  branchRoutineNode,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";

export const allResultsExample = {
  descriptionKey: "explorer.examples.all-results.description",
  guideKeys: [
    "explorer.examples.all-results.guide.branches",
    "explorer.examples.all-results.guide.future",
  ],
  id: "all-results",
  stage: {
    code: createAllResultsDemoCode(),
    flow: createAllResultsFlow(),
    replay: {
      replayDelayMs: 1400,
      runtime: {
        createRoutine: () => allResultsDemo,
      },
    },
  },
  titleKey: "explorer.examples.all-results.title",
} as const satisfies ExplorerExample<AllResultsDemoEvent, AllResultsDemoResult, string>;

function createAllResultsFlow(): ExplorerFlowGraph<AllResultsDemoEvent> {
  return {
    links: createAllResultsFlowLinks(),
    nodes: createAllResultsFlowNodes(),
  };
}

function createAllResultsFlowLinks(): ExplorerFlowGraph<AllResultsDemoEvent>["links"] {
  return [
    spawnLink("root", "result", "all(pageData)", ["all-open"]),
    spawnLink("result", "user", "loadUser", ["launch-user"]),
    spawnLink("result", "settings", "loadSettings", ["launch-settings"]),
    waitLink("user", "result", "user result", {
      activeEvents: ["all-wait-user"],
    }),
    waitLink("settings", "result", "settings result", {
      activeEvents: ["all-wait-settings"],
    }),
    waitLink("result", "root", "wait(pageData)", {
      activeEvents: ["wait-all"],
    }),
  ];
}

function createAllResultsFlowNodes(): ExplorerFlowGraph<AllResultsDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "renderDashboard", {
      activeEvents: ["routine", "all-open", "wait-all", "return-page", "done"],
      completedEvents: ["done"],
    }),
    branchRoutineNode("user", "loadUser", {
      activeEvents: ["user-open", "user-sleep", "user-return"],
      completedEvents: ["user-return"],
    }),
    branchRoutineNode("settings", "loadSettings", {
      activeEvents: ["settings-open", "settings-sleep", "settings-return"],
      completedEvents: ["settings-return"],
    }),
    {
      activeEvents: [
        "all-open",
        "launch-user",
        "launch-settings",
        "all-wait-user",
        "all-wait-settings",
        "wait-all",
        "user-return",
        "settings-return",
      ],
      completedEvents: ["wait-all"],
      id: "result",
      kind: "join",
      label: "pageData",
      statusRoutineIds: ["root", "all"],
    },
  ];
}
