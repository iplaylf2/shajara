import type { ExplorerReplayCursor, ExplorerReplayFrame } from "#/domain/explorer/contract";
import { createScope, sleep } from "@shajara/host";
import { headerDelayMs, sidebarDelayMs } from "./trace";
import { spawn, wait } from "@shajara/host/primitives";
import type { ForkJoinEvent } from "./trace";

export interface ForkJoinReplay {
  cancel: () => Promise<void>;
  run: (mark: (frame: ExplorerReplayFrame<ForkJoinEvent>) => void) => Promise<ForkJoinResult>;
}

export interface ForkJoinResult {
  header: string;
  sidebar: string;
}

export function createForkJoinReplay(): ForkJoinReplay {
  const scope = createScope();

  return {
    cancel: () => scope.cancel(),
    run: (mark) =>
      scope.run(function* loadPage() {
        return yield* loadPageRitual(mark);
      }),
  };
}

export function formatForkJoinResult(result: ForkJoinResult): string {
  return `${result.header} + ${result.sidebar}`;
}

function* loadPageRitual(mark: (frame: ExplorerReplayFrame<ForkJoinEvent>) => void) {
  const emit = createReplayEmitter(mark);

  yield* emitRootStart(emit);
  const header = yield* spawn(createHeaderRoutine(emit));
  const sidebar = yield* spawn(createSidebarRoutine(emit));
  yield* sleep(stepDelayMs);

  const headerValue = yield* wait(header);
  emit(
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

function createHeaderRoutine(emit: (frame: ExplorerReplayFrame<ForkJoinEvent>) => void) {
  return function* loadHeader() {
    emit(
      frame(
        ["routine", "spawn-sidebar", "header-enter"],
        [],
        [cursor("root", "spawn-sidebar", "running"), cursor("header", "header-enter", "running")],
      ),
    );
    yield* sleep(stepDelayMs);
    emit(
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
    emit(
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

function createSidebarRoutine(emit: (frame: ExplorerReplayFrame<ForkJoinEvent>) => void) {
  return function* loadSidebar() {
    emit(
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
    emit(
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
    emit(
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

function* emitRootStart(emit: (frame: ExplorerReplayFrame<ForkJoinEvent>) => void) {
  emit(frame(["routine"], [], [cursor("root", "routine", "running")]));
  yield* sleep(transitionDelayMs);
  emit(frame(["routine", "spawn-header"], [], [cursor("root", "spawn-header", "running")]));
  yield* sleep(transitionDelayMs);
}

function* emitRoutineClose(emit: (frame: ExplorerReplayFrame<ForkJoinEvent>) => void) {
  emit(
    frame(
      ["routine", "wait-close"],
      ["header-return", "wait-header", "sidebar-return", "wait-sidebar"],
      [cursor("root", "wait-close", "running")],
    ),
  );
  yield* sleep(transitionDelayMs);
  emit(
    frame(
      ["done"],
      ["header-return", "wait-header", "sidebar-return", "wait-sidebar", "wait-close", "done"],
      [cursor("root", "done", "running")],
    ),
  );
}

function createReplayEmitter(mark: (frame: ExplorerReplayFrame<ForkJoinEvent>) => void) {
  return function emit(frameValue: ExplorerReplayFrame<ForkJoinEvent>): void {
    mark(frameValue);
  };
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
