import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import type { LoadPageDemoEvent, LoadPageDemoResult } from "./runtime";
import {
  branchRoutineNode,
  parentRoutineNode,
  spawnLink,
  waitLink,
} from "#/domain/explorer/examples-kit";
import { createLoadPageDemoCode, loadPageDemo } from "./runtime";

export const forkJoinExample = {
  descriptionKey: "explorer.examples.fork-join.description",
  guideKeys: ["explorer.examples.fork-join.guide.fork", "explorer.examples.fork-join.guide.join"],
  id: "fork-join",
  stage: {
    code: createLoadPageDemoCode(),
    flow: createForkJoinFlow(),
    replay: {
      replayDelayMs: 1400,
      runtime: {
        createRoutine: () => loadPageDemo,
      },
    },
  },
  titleKey: "explorer.examples.fork-join.title",
} as const satisfies ExplorerExample<LoadPageDemoEvent, LoadPageDemoResult, string>;

function createForkJoinFlow(): ExplorerFlowGraph<LoadPageDemoEvent> {
  return {
    links: createForkJoinFlowLinks(),
    nodes: createForkJoinFlowNodes(),
  };
}

function createForkJoinFlowLinks(): ExplorerFlowGraph<LoadPageDemoEvent>["links"] {
  return [
    spawnLink("root", "header", "spawn(header)", ["spawn-header"]),
    spawnLink("root", "sidebar", "spawn(sidebar)", ["spawn-sidebar"]),
    waitLink("header", "root", "wait(header)", {
      activeEvents: ["wait-header"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
    waitLink("sidebar", "root", "wait(sidebar)", {
      activeEvents: ["wait-sidebar"],
      displayLabel: { kind: "hidden" },
      interruption: { kind: "none" },
    }),
  ];
}

function createForkJoinFlowNodes(): ExplorerFlowGraph<LoadPageDemoEvent>["nodes"] {
  return [
    parentRoutineNode("root", "loadPage", {
      activeEvents: [
        "routine",
        "spawn-header",
        "spawn-sidebar",
        "wait-header",
        "wait-sidebar",
        "wait-close",
        "done",
      ],
      completedEvents: ["done"],
    }),
    branchRoutineNode("header", "loadHeader", {
      activeEvents: ["spawn-header", "header-sleep", "wait-header", "header-return"],
      completedEvents: ["header-return"],
    }),
    branchRoutineNode("sidebar", "loadSidebar", {
      activeEvents: ["spawn-sidebar", "sidebar-sleep", "wait-sidebar", "sidebar-return"],
      completedEvents: ["sidebar-return"],
    }),
  ];
}
