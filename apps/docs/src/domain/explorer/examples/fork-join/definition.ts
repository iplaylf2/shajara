import type {
  ExplorerExample,
  ExplorerFlowGraph,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
} from "#/domain/explorer/contract";
import type { LoadPageDemoEvent, LoadPageDemoResult } from "./runtime";
import { createLoadPageDemoCode, initialLoadPageDemoTrace, loadPageDemo } from "./runtime";

export const forkJoinExample = {
  descriptionKey: "explorer.examples.fork-join.description",
  guideKeys: [
    "explorer.examples.fork-join.guide.scope",
    "explorer.examples.fork-join.guide.fork",
    "explorer.examples.fork-join.guide.join",
  ],
  id: "fork-join",
  stage: {
    code: createLoadPageDemoCode(),
    flow: createForkJoinFlow(),
    replay: {
      initialState: initialLoadPageDemoTrace,
      replayDelayMs: 1400,
      runtime: {
        createRoutine: () => loadPageDemo,
      },
    },
  },
  titleKey: "explorer.examples.fork-join.title",
} as const satisfies ExplorerExample<LoadPageDemoEvent, string, LoadPageDemoResult>;

function createForkJoinFlow(): ExplorerFlowGraph<LoadPageDemoEvent> {
  return {
    links: createForkJoinFlowLinks(),
    nodes: createForkJoinFlowNodes(),
  };
}

function createForkJoinFlowLinks(): readonly ExplorerFlowGraphLink<LoadPageDemoEvent>[] {
  return [
    {
      activeEvents: ["spawn-header"],
      from: "root",
      label: "spawn header",
      to: "header",
    },
    {
      activeEvents: ["spawn-sidebar"],
      from: "root",
      label: "spawn sidebar",
      to: "sidebar",
    },
    {
      activeEvents: ["wait-header"],
      from: "header",
      label: "wait(header)",
      to: "join",
    },
    {
      activeEvents: ["wait-sidebar"],
      from: "sidebar",
      label: "wait(sidebar)",
      to: "join",
    },
  ];
}

function createForkJoinFlowNodes(): readonly ExplorerFlowGraphNode<LoadPageDemoEvent>[] {
  return [
    {
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
      id: "root",
      kind: "parent",
      label: "page routine",
      statusRoutineIds: ["root"],
    },
    {
      activeEvents: ["spawn-header", "header-sleep", "wait-header", "header-return"],
      completedEvents: ["header-return"],
      id: "header",
      kind: "branch",
      label: "header task",
      statusRoutineIds: ["header"],
    },
    {
      activeEvents: ["spawn-sidebar", "sidebar-sleep", "wait-sidebar", "sidebar-return"],
      completedEvents: ["sidebar-return"],
      id: "sidebar",
      kind: "branch",
      label: "sidebar task",
      statusRoutineIds: ["sidebar"],
    },
    {
      activeEvents: ["wait-header", "wait-sidebar", "wait-close", "done"],
      completedEvents: ["done"],
      id: "join",
      kind: "join",
      label: "join",
      statusRoutineIds: ["root"],
    },
  ];
}
