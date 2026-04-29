// oxlint-disable max-lines-per-function
import {
  clearCursor,
  codeLine,
  codeSpacer,
  completeEvents,
  cursorAt,
  setCursor,
} from "#/domain/explorer/examples-kit";
import { enclose, spawn, wait } from "@shajara/host/primitives";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createLoadPageDemoCode() {
  return [
    codeLine("routine", "function* loadPage() {", ["done"]),
    codeLine("spawn-header", "  const header = yield* spawn(function* loadHeader() {", [
      "header-return",
    ]),
    codeLine("header-sleep", `    yield* sleep(${headerDelayMs});`, ["header-return"]),
    codeLine("header-return", '    return "header";', ["header-return"]),
    codeLine("header-close", "  });", ["header-return"]),
    codeSpacer(),
    codeLine("spawn-sidebar", "  const sidebar = yield* spawn(function* loadSidebar() {", [
      "sidebar-return",
    ]),
    codeLine("sidebar-sleep", `    yield* sleep(${sidebarDelayMs});`, ["sidebar-return"]),
    codeLine("sidebar-return", '    return "sidebar";', ["sidebar-return"]),
    codeLine("sidebar-close", "  });", ["sidebar-return"]),
    codeSpacer(),
    codeLine("wait-open", "  return {", ["done"]),
    codeLine("wait-header", "    header: yield* wait(header),", ["wait-header"]),
    codeLine("wait-sidebar", "    sidebar: yield* wait(sidebar),", ["wait-sidebar"]),
    codeLine("wait-close", "  };", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* loadPageDemo(
  emit: ExplorerReplayEmit<LoadPageDemoEvent>,
): RiteCoroutine<LoadPageDemoResult> {
  return yield* enclose(function* loadPage(): RiteCoroutine<LoadPageDemoResult> {
    emit({ actions: [setCursor(cursorAt("root", "spawn-header", "running"))] });
    const header = yield* spawn(function* loadHeader(): RiteCoroutine<string> {
      emit({ actions: [setCursor(cursorAt("header", "header-sleep", "running"))] });
      yield* sleep(headerDelayMs);
      emit({
        actions: [setCursor(cursorAt("header", ["header-return", "header-close"], "running"))],
      });
      try {
        return "header";
      } finally {
        emit({
          actions: [clearCursor("header"), completeEvents("header-return")],
        });
      }
    });
    emit({ actions: [setCursor(cursorAt("root", "spawn-sidebar", "running"))] });
    const sidebar = yield* spawn(function* loadSidebar(): RiteCoroutine<string> {
      emit({ actions: [setCursor(cursorAt("sidebar", "sidebar-sleep", "running"))] });
      yield* sleep(sidebarDelayMs);
      emit({
        actions: [setCursor(cursorAt("sidebar", ["sidebar-return", "sidebar-close"], "running"))],
      });
      try {
        return "sidebar";
      } finally {
        emit({
          actions: [clearCursor("sidebar"), completeEvents("sidebar-return")],
        });
      }
    });
    emit({ actions: [setCursor(cursorAt("root", "wait-header", "blocked"))] });
    const headerValue = yield* wait(header);
    emit({
      actions: [
        completeEvents("wait-header"),
        setCursor(cursorAt("root", "wait-sidebar", "blocked")),
      ],
    });
    const sidebarValue = yield* wait(sidebar);
    emit({
      actions: [
        completeEvents("wait-sidebar"),
        setCursor(cursorAt("root", ["wait-close", "done"], "running")),
      ],
    });
    try {
      return { header: headerValue, sidebar: sidebarValue };
    } finally {
      emit({ actions: [clearCursor("root"), completeEvents("done")] });
    }
  });
}

export interface LoadPageDemoResult {
  header: string;
  sidebar: string;
}

export type LoadPageDemoEvent = ExplorerAuthoredEvent<ReturnType<typeof createLoadPageDemoCode>>;

const headerDelayMs = 1000;
const sidebarDelayMs = 2000;
