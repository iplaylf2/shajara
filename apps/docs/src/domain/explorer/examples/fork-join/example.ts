import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import { forkJoinCode, initialForkJoinTrace } from "./trace";
import type { ForkJoinEvent } from "./trace";
import type { ForkJoinResult } from "./runtime";
import { createForkJoinReplay } from "./runtime";

export const forkJoinExample = {
  descriptionKey: "explorer.examples.fork-join.description",
  guideKeys: [
    "explorer.examples.fork-join.guide.scope",
    "explorer.examples.fork-join.guide.fork",
    "explorer.examples.fork-join.guide.join",
  ],
  id: "fork-join",
  stage: {
    code: forkJoinCode,
    flow: createForkJoinFlow(),
    replay: {
      initialState: initialForkJoinTrace,
      replayDelayMs: 1400,
      runtime: {
        createRunner: createForkJoinReplay,
      },
    },
  },
  titleKey: "explorer.examples.fork-join.title",
} as const satisfies ExplorerExample<ForkJoinEvent, string, ForkJoinResult>;

// oxlint-disable-next-line max-lines-per-function
function createForkJoinFlow(): ExplorerFlowGraph<ForkJoinEvent> {
  return {
    links: [
      {
        activeEvents: ["spawn-header"],
        from: "routine",
        to: "header",
      },
      {
        activeEvents: ["spawn-sidebar"],
        from: "routine",
        to: "sidebar",
      },
      {
        activeEvents: ["wait-header"],
        from: "header",
        to: "join",
      },
      {
        activeEvents: ["wait-sidebar"],
        from: "sidebar",
        to: "join",
      },
    ],
    nodes: [
      {
        activeEvents: [
          "routine",
          "spawn-header",
          "spawn-sidebar",
          "wait-open",
          "wait-header",
          "wait-sidebar",
          "wait-close",
        ],
        doneEvents: ["done"],
        id: "routine",
        kind: "parent",
        label: "page routine",
      },
      {
        activeEvents: [
          "spawn-header",
          "header-enter",
          "header-sleep",
          "wait-header",
          "header-return",
        ],
        doneEvents: ["header-return"],
        id: "header",
        kind: "branch",
        label: "header task",
      },
      {
        activeEvents: [
          "spawn-sidebar",
          "sidebar-enter",
          "sidebar-sleep",
          "wait-sidebar",
          "sidebar-return",
        ],
        doneEvents: ["sidebar-return"],
        id: "sidebar",
        kind: "branch",
        label: "sidebar task",
      },
      {
        activeEvents: ["wait-open", "wait-header", "wait-sidebar", "wait-close"],
        doneEvents: ["done"],
        id: "join",
        kind: "join",
        label: "join",
      },
    ],
    ticks: [
      {
        label: "ready",
        nodeId: "header",
        visibleEvents: ["header-return"],
      },
      {
        label: "ready",
        nodeId: "sidebar",
        visibleEvents: ["sidebar-return"],
      },
    ],
  };
}
