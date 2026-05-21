import type { AllResultsDemoEvent, AllResultsDemoResult } from "./runtime";
import type { ExplorerExample, ExplorerFlow } from "#/domain/explorer/contract";
import { allResultsDemo, createAllResultsDemoCode } from "./runtime";
import {
  callerNode,
  coordinatorNode,
  spawnLink,
  waitLink,
  workerNode,
} from "#/domain/explorer/examples-kit";

export const allResultsExample = {
  descriptionKey: "explorer.examples.all-results.description",
  guideKeys: [
    "explorer.examples.all-results.guide.work",
    "explorer.examples.all-results.guide.future",
  ],
  id: "all-results",
  stage: {
    code: createAllResultsDemoCode(),
    flow: createAllResultsFlow(),
    replay: {
      replayDelayMs: 1400,
      runtime: {
        createProgram: () => allResultsDemo,
      },
    },
  },
  titleKey: "explorer.examples.all-results.title",
} as const satisfies ExplorerExample<AllResultsDemoEvent, AllResultsDemoResult, string>;

function createAllResultsFlow(): ExplorerFlow<AllResultsDemoEvent> {
  return {
    links: createAllResultsFlowLinks(),
    nodes: createAllResultsFlowNodes(),
  };
}

function createAllResultsFlowLinks(): ExplorerFlow<AllResultsDemoEvent>["links"] {
  return [
    spawnLink("root", "result", "all(pageData)", ["all-open"]),
    spawnLink("result", "user", "loadUser", ["launch-user"]),
    spawnLink("result", "settings", "loadSettings", ["launch-settings"]),
    waitLink("user", "result", "user result", {
      activeEvents: ["all-wait-user"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
    waitLink("settings", "result", "settings result", {
      activeEvents: ["all-wait-settings"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
    waitLink("result", "root", "wait(pageData)", {
      activeEvents: ["wait-all"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
  ];
}

function createAllResultsFlowNodes(): ExplorerFlow<AllResultsDemoEvent>["nodes"] {
  return [
    callerNode("root", "renderDashboard", {
      activeEvents: ["function-open", "all-open", "wait-all", "return-page", "done"],
      completedEvents: ["done"],
    }),
    workerNode("user", "loadUser", {
      activeEvents: ["user-open", "user-sleep", "user-return"],
      completedEvents: ["user-return"],
    }),
    workerNode("settings", "loadSettings", {
      activeEvents: ["settings-open", "settings-sleep", "settings-return"],
      completedEvents: ["settings-return"],
    }),
    coordinatorNode(
      "result",
      "pageData",
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
      },
      { statusTargetIds: ["root", "all"] },
    ),
  ];
}
