import type {
  ExplorerReplayCursor,
  ExplorerReplayEmit,
  ExplorerReplayFrame,
  ExplorerReplayRoutine,
} from "#/domain/explorer/contract";
import { headerDelayMs, sidebarDelayMs } from "./trace";
import { spawn, wait } from "@shajara/host/primitives";
import type { ForkJoinEvent } from "./trace";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

export interface ForkJoinResult {
  header: string;
  sidebar: string;
}

export function createForkJoinReplay(): ExplorerReplayRoutine<ForkJoinEvent, ForkJoinResult> {
  return loadPageRitual;
}

function* loadPageRitual(emit: ExplorerReplayEmit<ForkJoinEvent>): RiteCoroutine<ForkJoinResult> {
  yield* emitRootStart(emit);
  const header = yield* spawn(createHeaderRoutine(emit));
  const sidebar = yield* spawn(createSidebarRoutine(emit));
  yield* sleep(stepDelayMs);

  const headerValue = yield* wait(header);
  yield* emit(
    frame(
      ["routine", "wait-sidebar", "sidebar-sleep"],
      ["header-return", "wait-header"],
      [cursor("root", "wait-sidebar", "blocked"), cursor("sidebar", "sidebar-sleep", "blocked")],
    ),
  );

  const sidebarValue = yield* wait(sidebar);
  yield* emitRoutineClose(emit);

  return { header: headerValue, sidebar: sidebarValue };
}

function createHeaderRoutine(emit: ExplorerReplayEmit<ForkJoinEvent>) {
  return function* loadHeader(): RiteCoroutine<string> {
    yield* emit(
      frame(
        ["routine", "spawn-sidebar", "header-enter"],
        [],
        [cursor("root", "spawn-sidebar", "running"), cursor("header", "header-enter", "running")],
      ),
    );
    yield* sleep(stepDelayMs);
    yield* emit(
      frame(
        ["routine", "wait-open", "header-sleep", "sidebar-enter"],
        [],
        [
          cursor("root", "wait-open", "running"),
          cursor("header", "header-sleep", "blocked"),
          cursor("sidebar", "sidebar-enter", "running"),
        ],
      ),
    );
    yield* sleep(headerDelayMs);
    yield* emit(
      frame(
        ["routine", "wait-header", "header-return", "sidebar-sleep"],
        ["header-return"],
        [
          cursor("root", "wait-header", "blocked"),
          cursor("header", "header-return", "running"),
          cursor("sidebar", "sidebar-sleep", "blocked"),
        ],
      ),
    );
    yield* sleep(transitionDelayMs);

    return "header";
  };
}

function createSidebarRoutine(emit: ExplorerReplayEmit<ForkJoinEvent>) {
  return function* loadSidebar(): RiteCoroutine<string> {
    yield* emit(
      frame(
        ["routine", "wait-open", "header-enter", "sidebar-enter"],
        [],
        [
          cursor("root", "wait-open", "running"),
          cursor("header", "header-enter", "running"),
          cursor("sidebar", "sidebar-enter", "running"),
        ],
      ),
    );
    yield* sleep(stepDelayMs);
    yield* emit(
      frame(
        ["routine", "wait-header", "header-sleep", "sidebar-sleep"],
        [],
        [
          cursor("root", "wait-header", "blocked"),
          cursor("header", "header-sleep", "blocked"),
          cursor("sidebar", "sidebar-sleep", "blocked"),
        ],
      ),
    );
    yield* sleep(sidebarDelayMs);
    yield* emit(
      frame(
        ["routine", "wait-sidebar", "sidebar-return"],
        ["header-return", "wait-header", "sidebar-return"],
        [cursor("root", "wait-sidebar", "blocked"), cursor("sidebar", "sidebar-return", "running")],
      ),
    );
    yield* sleep(transitionDelayMs);

    return "sidebar";
  };
}

function* emitRootStart(emit: ExplorerReplayEmit<ForkJoinEvent>): RiteCoroutine<void> {
  yield* emit(frame(["routine"], [], [cursor("root", "routine", "running")]));
  yield* sleep(transitionDelayMs);
  yield* emit(frame(["routine", "spawn-header"], [], [cursor("root", "spawn-header", "running")]));
  yield* sleep(transitionDelayMs);
}

function* emitRoutineClose(emit: ExplorerReplayEmit<ForkJoinEvent>): RiteCoroutine<void> {
  yield* emit(
    frame(
      ["routine", "wait-close"],
      ["header-return", "wait-header", "sidebar-return", "wait-sidebar"],
      [cursor("root", "wait-close", "running")],
    ),
  );
  yield* sleep(transitionDelayMs);
  yield* emit(
    frame(
      ["done"],
      ["header-return", "wait-header", "sidebar-return", "wait-sidebar", "wait-close", "done"],
      [cursor("root", "done", "running")],
    ),
  );
}

function cursor(
  routineId: string,
  event: ForkJoinEvent,
  mode: ExplorerReplayCursor<ForkJoinEvent>["mode"],
): ExplorerReplayCursor<ForkJoinEvent> {
  return { event, mode, routineId };
}

function frame(
  active: readonly ForkJoinEvent[],
  completed: readonly ForkJoinEvent[],
  cursors: readonly ExplorerReplayCursor<ForkJoinEvent>[],
): ExplorerReplayFrame<ForkJoinEvent> {
  return { active, completed, cursors };
}

const stepDelayMs = 90;
const transitionDelayMs = 110;
