import type { ArrayValues } from "type-fest";

export const FORK_JOIN_CODE = [
  { event: "routine", text: "function* loadPage() {" },
  { event: "spawn-header", text: "  const header = yield* spawn(function* loadHeader() {" },
  { event: "header-start", text: "    yield* sleep(660);" },
  { event: "header-done", text: '    return "header";' },
  { event: "header-done", text: "  });" },
  { event: "spawn-sidebar", text: "  const sidebar = yield* spawn(function* loadSidebar() {" },
  { event: "sidebar-start", text: "    yield* sleep(960);" },
  { event: "sidebar-done", text: '    return "sidebar";' },
  { event: "sidebar-done", text: "  });" },
  { event: "wait", text: "  return {" },
  { event: "wait-header", text: "    header: yield* wait(header)," },
  { event: "wait-sidebar", text: "    sidebar: yield* wait(sidebar)," },
  { event: "done", text: "  };" },
  { event: "done", text: "}" },
] as const;

export const INITIAL_FORK_JOIN_TRACE: ForkJoinTrace = {
  active: "routine",
  completed: [],
  result: "pending",
};

export type ForkJoinEvent = ArrayValues<typeof FORK_JOIN_CODE>["event"];

export interface ForkJoinTrace {
  active: ForkJoinEvent;
  completed: readonly ForkJoinEvent[];
  result: string;
}
