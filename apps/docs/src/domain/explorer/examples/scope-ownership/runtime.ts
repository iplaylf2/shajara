// oxlint-disable max-lines-per-function
import { codeLine, cursorAt } from "#/domain/explorer/examples-kit";
import { enclose, spawn } from "@shajara/host/primitives";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createScopeOwnershipDemoCode() {
  return [
    codeLine("routine", "function* publishArticle() {", ["done"]),
    codeLine("enclose-open", "  const result = yield* enclose(function* commitArticle() {", [
      "enclose-close",
    ]),
    codeLine("spawn-index", "    yield* spawn(function* updateSearchIndex() {", ["index-close"]),
    codeLine("index-sleep", `      yield* sleep(${indexDelayMs});`, ["index-close"]),
    codeLine("index-close", "    });", ["index-close"]),
    codeLine("inner-return", '    return "published";', ["inner-return"]),
    codeLine("enclose-close", "  });", ["enclose-close"]),
    codeLine("return-result", "  return result;", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* scopeOwnershipDemo(
  emit: ExplorerReplayEmit<ScopeOwnershipDemoEvent>,
): RiteCoroutine<string> {
  return yield* enclose(function* publishArticle(): RiteCoroutine<string> {
    yield* emit({
      cursor: cursorAt("root", ["enclose-open", "launch-scope"], "running"),
    });
    const result = yield* enclose(function* commitArticle(): RiteCoroutine<string> {
      yield* emit({
        cursor: cursorAt("scope", ["launch-index", "spawn-index"], "running"),
      });
      yield* spawn(function* updateSearchIndex(): RiteCoroutine<void> {
        yield* emit({
          cursor: cursorAt("index", "index-sleep", "running"),
        });
        yield* sleep(indexDelayMs);
        yield* emit({
          clearCursor: "index",
          completed: ["index-close", "scope-wait-index"],
        });
      });

      yield* emit({
        cursor: cursorAt("scope", "inner-return", "running"),
      });
      try {
        return "published";
      } finally {
        yield* emit({
          completed: "inner-return",
          cursors: [
            cursorAt("root", ["enclose-open", "scope-wait-root"], "blocked"),
            cursorAt("scope", "scope-wait-index", "blocked"),
          ],
        });
      }
    });

    yield* emit({
      clearCursor: "scope",
      completed: ["enclose-close", "scope-wait-root"],
      cursor: cursorAt("root", "return-result", "running"),
    });
    try {
      return result;
    } finally {
      yield* emit({
        clearCursor: "root",
        completed: "done",
      });
    }
  });
}

export type ScopeOwnershipDemoEvent =
  | ReturnType<typeof createScopeOwnershipDemoCode>[number]["id"]
  | "launch-scope"
  | "launch-index"
  | "scope-wait-index"
  | "scope-wait-root";

const indexDelayMs = 1000;
