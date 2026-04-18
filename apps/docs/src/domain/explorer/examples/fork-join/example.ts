import type { ExplorerExample, ExplorerFlowGraph } from "#/domain/explorer/contract";
import { createForkJoinReplay, formatForkJoinResult } from "./runtime";
import { forkJoinCode, initialForkJoinTrace } from "./trace";
import type { ForkJoinEvent } from "./trace";
import type { ForkJoinResult } from "./runtime";

const forkJoinFlow = {
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
      activeEvents: ["routine"],
      doneEvents: ["routine"],
      id: "routine",
      kind: "parent",
      label: "root routine",
    },
    {
      activeEvents: ["header-start"],
      doneEvents: ["header-done"],
      id: "header",
      kind: "branch",
      label: "loadHeader",
    },
    {
      activeEvents: ["sidebar-start"],
      doneEvents: ["sidebar-done"],
      id: "sidebar",
      kind: "branch",
      label: "loadSidebar",
    },
    {
      activeEvents: ["wait", "wait-header", "wait-sidebar"],
      doneEvents: ["done"],
      id: "join",
      kind: "join",
      label: "wait results",
    },
  ],
  resultLabel: "result",
  scopeLabel: "function* loadPage()",
  ticks: [
    {
      label: "done",
      nodeId: "header",
      visibleEvents: ["header-done"],
    },
    {
      label: "done",
      nodeId: "sidebar",
      visibleEvents: ["sidebar-done"],
    },
  ],
} as const satisfies ExplorerFlowGraph<ForkJoinEvent>;

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
    flow: forkJoinFlow,
    replay: {
      initialState: initialForkJoinTrace,
      replayDelayMs: 900,
      runtime: {
        createRunner: createForkJoinReplay,
        formatResult: formatForkJoinResult,
      },
    },
  },
  titleKey: "explorer.examples.fork-join.title",
} as const satisfies ExplorerExample<ForkJoinEvent, string, ForkJoinResult>;
