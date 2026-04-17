import type { ArrayValues } from "type-fest";

export const HOST_CONCURRENCY_CODE = [
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

export const INITIAL_HOST_TRACE: HostTrace = {
  active: "routine",
  completed: [],
  result: "pending",
};

export type HostConcurrencyEvent = ArrayValues<typeof HOST_CONCURRENCY_CODE>["event"];

export interface HostTrace {
  active: HostConcurrencyEvent;
  completed: readonly HostConcurrencyEvent[];
  result: string;
}
