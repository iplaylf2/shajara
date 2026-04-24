import type { ExplorerExampleCodeLine, ExplorerReplayState } from "#/domain/explorer/contract";

export const headerDelayMs = 420;
export const sidebarDelayMs = 640;

const forkJoinEvents = [
  "routine",
  "spawn-header",
  "header-enter",
  "header-sleep",
  "header-return",
  "spawn-sidebar",
  "sidebar-enter",
  "sidebar-sleep",
  "sidebar-return",
  "wait-open",
  "wait-header",
  "wait-sidebar",
  "wait-close",
  "done",
] as const;

export type ForkJoinEvent = (typeof forkJoinEvents)[number];

export const forkJoinCode = [
  {
    cursorEvents: ["routine"],
    doneEvents: ["done"],
    text: "function* loadPage() {",
  },
  {
    cursorEvents: ["spawn-header", "header-enter"],
    doneEvents: ["header-return"],
    text: "  const header = yield* spawn(function* loadHeader() {",
  },
  {
    cursorEvents: ["header-sleep"],
    doneEvents: ["header-return"],
    text: `    yield* sleep(${headerDelayMs});`,
  },
  {
    cursorEvents: ["header-return"],
    doneEvents: ["header-return"],
    text: '    return "header";',
  },
  {
    doneEvents: ["header-return"],
    text: "  });",
  },
  {
    cursorEvents: ["spawn-sidebar", "sidebar-enter"],
    doneEvents: ["sidebar-return"],
    text: "  const sidebar = yield* spawn(function* loadSidebar() {",
  },
  {
    cursorEvents: ["sidebar-sleep"],
    doneEvents: ["sidebar-return"],
    text: `    yield* sleep(${sidebarDelayMs});`,
  },
  {
    cursorEvents: ["sidebar-return"],
    doneEvents: ["sidebar-return"],
    text: '    return "sidebar";',
  },
  {
    doneEvents: ["sidebar-return"],
    text: "  });",
  },
  {
    cursorEvents: ["wait-open"],
    doneEvents: ["done"],
    text: "  return {",
  },
  {
    cursorEvents: ["wait-header"],
    doneEvents: ["wait-header"],
    text: "    header: yield* wait(header),",
  },
  {
    cursorEvents: ["wait-sidebar"],
    doneEvents: ["wait-sidebar"],
    text: "    sidebar: yield* wait(sidebar),",
  },
  {
    cursorEvents: ["wait-close"],
    doneEvents: ["wait-close"],
    text: "  };",
  },
  {
    cursorEvents: ["done"],
    doneEvents: ["done"],
    text: "}",
  },
] as const satisfies readonly ExplorerExampleCodeLine<ForkJoinEvent>[];

export const initialForkJoinTrace = {
  active: ["routine"],
  completed: [],
  cursors: [{ event: "routine", mode: "running", routineId: "root" }],
} as const satisfies ExplorerReplayState<ForkJoinEvent>;
