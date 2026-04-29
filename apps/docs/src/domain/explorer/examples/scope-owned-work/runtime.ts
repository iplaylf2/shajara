// oxlint-disable max-lines-per-function
import {
  clearCursor,
  codeLine,
  codeSpacer,
  completeEvents,
  cursorAt,
  enclosedRoutine,
  setCursor,
} from "#/domain/explorer/examples-kit";
import { enclose, spawn } from "@shajara/host/primitives";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createScopeOwnedWorkDemoCode() {
  return [
    codeLine("routine", "function* publishArticle() {", ["done"]),
    codeLine("enclose-open", "  const result = yield* enclose(function* commitArticle() {", [
      "enclose-close",
    ]),
    codeLine("spawn-index", "    yield* spawn(function* updateSearchIndex() {", ["index-close"]),
    codeLine("index-sleep", `      yield* sleep(${indexDelayMs});`, ["index-close"]),
    codeLine("index-close", "    });", ["index-close"]),
    codeSpacer(),
    codeLine("inner-return", '    return "published";', ["inner-return"]),
    codeLine("enclose-close", "  });", ["enclose-close"]),
    codeSpacer(),
    codeLine("return-result", "  return result;", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* scopeOwnedWorkDemo(
  emit: ExplorerReplayEmit<ScopeOwnedWorkDemoEvent>,
): RiteCoroutine<string> {
  return yield* enclose(function* publishArticle(): RiteCoroutine<string> {
    yield* emit({
      actions: [setCursor(cursorAt("root", ["enclose-open", "launch-scope"], "running"))],
    });
    const result = yield* enclose(
      enclosedRoutine(
        emit,
        {
          childEvent: ["launch-index", "spawn-index"],
          childRoutineId: "scope",
          parentEvent: "enclose-open",
          parentRoutineId: "root",
          waitEvent: "scope-wait-root",
        },
        function* commitArticle(): RiteCoroutine<string> {
          yield* spawn(function* updateSearchIndex(): RiteCoroutine<void> {
            yield* emit({ actions: [setCursor(cursorAt("index", "index-sleep", "running"))] });
            yield* sleep(indexDelayMs);
            yield* emit({
              actions: [clearCursor("index"), completeEvents(["index-close", "scope-wait-index"])],
            });
          });

          yield* emit({ actions: [setCursor(cursorAt("scope", "inner-return", "running"))] });
          try {
            return "published";
          } finally {
            yield* emit({
              actions: [
                completeEvents("inner-return"),
                setCursor(cursorAt("scope", "scope-wait-index", "blocked")),
              ],
            });
          }
        },
      ),
    );

    yield* emit({
      actions: [
        clearCursor("scope"),
        completeEvents(["enclose-close", "scope-wait-root"]),
        setCursor(cursorAt("root", "return-result", "running")),
      ],
    });
    try {
      return result;
    } finally {
      yield* emit({ actions: [clearCursor("root"), completeEvents("done")] });
    }
  });
}

export type ScopeOwnedWorkDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createScopeOwnedWorkDemoCode>,
  "launch-scope" | "launch-index" | "scope-wait-index" | "scope-wait-root"
>;

const indexDelayMs = 1000;
