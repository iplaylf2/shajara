import { FORK_JOIN_CODE, INITIAL_FORK_JOIN_TRACE } from "#/domain/explorer/fork-join/trace";
import type { ExplorerExample } from "#/domain/explorer/contract";
import type { ForkJoinEvent } from "#/domain/explorer/fork-join/trace";

export const forkJoinExample = {
  descriptionKey: "explorer.examples.fork-join.description",
  guideKeys: [
    "explorer.examples.fork-join.guide.scope",
    "explorer.examples.fork-join.guide.fork",
    "explorer.examples.fork-join.guide.join",
  ],
  id: "fork-join",
  stage: {
    code: FORK_JOIN_CODE,
    replay: {
      initialState: INITIAL_FORK_JOIN_TRACE,
      replayDelayMs: 900,
      runtimeId: "fork-join",
    },
    scene: {
      ariaLabel: "Code-driven fork-join animation",
      links: [
        {
          activeEvents: ["spawn-header"],
          path: "M210 156 C248 116 276 112 322 116",
        },
        {
          activeEvents: ["spawn-sidebar"],
          path: "M210 174 C248 214 276 220 322 208",
        },
        {
          activeEvents: ["wait-header"],
          path: "M434 116 C494 112 526 128 574 156",
        },
        {
          activeEvents: ["wait-sidebar"],
          path: "M434 208 C494 212 526 194 574 174",
        },
      ],
      markerId: "fork-join-arrow",
      nodes: [
        {
          activeEvents: ["routine"],
          doneEvents: ["routine"],
          label: "root routine",
          left: 98,
          top: 138,
          variant: "parent",
        },
        {
          activeEvents: ["header-start"],
          doneEvents: ["header-done"],
          label: "loadHeader",
          left: 322,
          top: 96,
          variant: "branch",
        },
        {
          activeEvents: ["sidebar-start"],
          doneEvents: ["sidebar-done"],
          label: "loadSidebar",
          left: 322,
          top: 188,
          variant: "branch",
        },
        {
          activeEvents: ["wait", "wait-header", "wait-sidebar"],
          doneEvents: ["done"],
          label: "wait results",
          left: 574,
          top: 138,
          variant: "join",
        },
      ],
      result: {
        height: 28,
        label: "result",
        labelLeft: 96,
        labelTop: 276,
        left: 148,
        radius: 8,
        top: 258,
        valueLeft: 166,
        valueTop: 277,
        width: 186,
      },
      scope: {
        height: 252,
        label: "function* loadPage()",
        labelLeft: 86,
        labelTop: 72,
        left: 62,
        radius: 16,
        top: 38,
        width: 638,
      },
      ticks: [
        {
          label: "done",
          left: 378,
          top: 176,
          visibleEvents: ["header-done"],
        },
        {
          label: "done",
          left: 378,
          top: 266,
          visibleEvents: ["sidebar-done"],
        },
      ],
      viewBox: "0 0 760 330",
    },
  },
  titleKey: "explorer.examples.fork-join.title",
} as const satisfies ExplorerExample<ForkJoinEvent>;
