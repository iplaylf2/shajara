// oxlint-disable max-lines-per-function
import {
  clearReplayCursor,
  codeLine,
  completeReplayEvents,
  cursorAt,
  replayTrace,
  setReplayCursor,
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
    codeLine("spawn-sidebar", "  const sidebar = yield* spawn(function* loadSidebar() {", [
      "sidebar-return",
    ]),
    codeLine("sidebar-sleep", `    yield* sleep(${sidebarDelayMs});`, ["sidebar-return"]),
    codeLine("sidebar-return", '    return "sidebar";', ["sidebar-return"]),
    codeLine("sidebar-close", "  });", ["sidebar-return"]),
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
    yield* emit(replayTrace(setReplayCursor(cursorAt("root", "spawn-header", "running"))));
    const header = yield* spawn(function* loadHeader(): RiteCoroutine<string> {
      yield* emit(replayTrace(setReplayCursor(cursorAt("header", "header-sleep", "running"))));
      yield* sleep(headerDelayMs);
      yield* emit(
        replayTrace(
          setReplayCursor(cursorAt("header", ["header-return", "header-close"], "running")),
        ),
      );
      try {
        return "header";
      } finally {
        yield* emit(
          replayTrace(clearReplayCursor("header"), completeReplayEvents("header-return")),
        );
      }
    });
    yield* emit(replayTrace(setReplayCursor(cursorAt("root", "spawn-sidebar", "running"))));
    const sidebar = yield* spawn(function* loadSidebar(): RiteCoroutine<string> {
      yield* emit(replayTrace(setReplayCursor(cursorAt("sidebar", "sidebar-sleep", "running"))));
      yield* sleep(sidebarDelayMs);
      yield* emit(
        replayTrace(
          setReplayCursor(cursorAt("sidebar", ["sidebar-return", "sidebar-close"], "running")),
        ),
      );
      try {
        return "sidebar";
      } finally {
        yield* emit(
          replayTrace(clearReplayCursor("sidebar"), completeReplayEvents("sidebar-return")),
        );
      }
    });
    yield* emit(replayTrace(setReplayCursor(cursorAt("root", "wait-header", "blocked"))));
    const headerValue = yield* wait(header);
    yield* emit(
      replayTrace(
        completeReplayEvents("wait-header"),
        setReplayCursor(cursorAt("root", "wait-sidebar", "blocked")),
      ),
    );
    const sidebarValue = yield* wait(sidebar);
    yield* emit(
      replayTrace(
        completeReplayEvents("wait-sidebar"),
        setReplayCursor(cursorAt("root", ["wait-close", "done"], "running")),
      ),
    );
    try {
      return { header: headerValue, sidebar: sidebarValue };
    } finally {
      yield* emit(replayTrace(clearReplayCursor("root"), completeReplayEvents("done")));
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
