// oxlint-disable max-lines-per-function
import { branch, spawn } from "@shajara/host/primitives";
import {
  branchWait,
  clearCursor,
  codeLine,
  codeSpacer,
  completeEvents,
  cursorAt,
  setCursor,
} from "#/domain/explorer/examples-kit";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createScopeOwnedWorkDemoCode() {
  return [
    codeLine("function-open", "function* publishArticle() {", ["done"]),
    codeLine("branch-open", "  const result = yield* branch(function* commitArticle() {", [
      "branch-close",
    ]),
    codeLine("spawn-index", "    yield* spawn(function* updateSearchIndex() {", ["index-close"]),
    codeLine("index-sleep", `      yield* sleep(${indexDelayMs});`, ["index-close"]),
    codeLine("index-close", "    });", ["index-close"]),
    codeSpacer(),
    codeLine("inner-return", '    return "published";', ["inner-return"]),
    codeLine("branch-close", "  });", ["branch-close"]),
    codeSpacer(),
    codeLine("return-result", "  return result;", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* scopeOwnedWorkDemo(
  emit: ExplorerReplayEmit<ScopeOwnedWorkDemoEvent>,
): RiteCoroutine<string> {
  return yield* branch(function* publishArticle(): RiteCoroutine<string> {
    emit({
      actions: [setCursor(cursorAt("root", ["branch-open", "launch-scope"], "running"))],
    });
    const result = yield* branch(
      branchWait(
        emit,
        { events: ["branch-open", "scope-wait-root"], targetId: "root" },
        function* commitArticle(): RiteCoroutine<string> {
          emit({
            actions: [setCursor(cursorAt("commit", ["launch-index", "spawn-index"], "running"))],
          });
          yield* spawn(function* updateSearchIndex(): RiteCoroutine<void> {
            emit({ actions: [setCursor(cursorAt("index", "index-sleep", "running"))] });
            yield* sleep(indexDelayMs);
            emit({
              actions: [clearCursor("index"), completeEvents(["index-close", "scope-wait-index"])],
            });
          });

          emit({ actions: [setCursor(cursorAt("commit", "inner-return", "running"))] });
          try {
            return "published";
          } finally {
            emit({
              actions: [
                completeEvents("inner-return"),
                setCursor(cursorAt("commit", "scope-wait-index", "blocked")),
              ],
            });
          }
        },
      ),
    );

    emit({
      actions: [
        clearCursor("commit"),
        completeEvents(["branch-close", "scope-wait-root"]),
        setCursor(cursorAt("root", "return-result", "running")),
      ],
    });
    try {
      return result;
    } finally {
      emit({ actions: [clearCursor("root"), completeEvents("done")] });
    }
  });
}

export type ScopeOwnedWorkDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createScopeOwnedWorkDemoCode>,
  "launch-scope" | "launch-index" | "scope-wait-index" | "scope-wait-root"
>;

const indexDelayMs = 1000;
