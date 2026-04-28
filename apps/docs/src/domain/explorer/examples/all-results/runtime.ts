// oxlint-disable max-lines-per-function
import { all, enclose, wait } from "@shajara/host/primitives";
import {
  clearReplayCursor,
  codeLine,
  completeReplayEvents,
  cursorAt,
  replayTrace,
  setReplayCursor,
  setReplayCursors,
} from "#/domain/explorer/examples-kit";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createAllResultsDemoCode() {
  return [
    codeLine("routine", "function* renderDashboard() {", ["done"]),
    codeLine("all-open", "  const pageData = yield* all([", ["wait-all"]),
    codeLine("user-open", "    function* loadUser() {", ["user-return"]),
    codeLine("user-sleep", `      yield* sleep(${userDelayMs});`, ["user-return"]),
    codeLine("user-return", '      return "user";', ["user-return"]),
    codeLine("user-close", "    },", ["user-return"]),
    codeLine("settings-open", "    function* loadSettings() {", ["settings-return"]),
    codeLine("settings-sleep", `      yield* sleep(${settingsDelayMs});`, ["settings-return"]),
    codeLine("settings-return", '      return "settings";', ["settings-return"]),
    codeLine("settings-close", "    },", ["settings-return"]),
    codeLine("all-close", "  ] as const);", ["wait-all"]),
    codeLine("wait-all", "  const [user, settings] = yield* wait(pageData);", ["wait-all"]),
    codeLine("return-page", "  return { user, settings };", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* allResultsDemo(
  emit: ExplorerReplayEmit<AllResultsDemoEvent>,
): RiteCoroutine<AllResultsDemoResult> {
  return yield* enclose(function* renderDashboard(): RiteCoroutine<AllResultsDemoResult> {
    yield* emit(
      replayTrace(
        setReplayCursors([
          cursorAt("root", "all-open", "running"),
          cursorAt("all", ["launch-user", "launch-settings"], "running"),
        ]),
      ),
    );
    const pageData = yield* all([
      function* loadUser(): RiteCoroutine<string> {
        yield* emit(
          replayTrace(
            setReplayCursors([
              cursorAt("all", ["all-wait-user", "all-wait-settings"], "blocked"),
              cursorAt("user", "user-sleep", "running"),
            ]),
          ),
        );
        yield* sleep(userDelayMs);
        yield* emit(
          replayTrace(setReplayCursor(cursorAt("user", ["user-return", "user-close"], "running"))),
        );
        try {
          return "user";
        } finally {
          yield* emit(
            replayTrace(
              clearReplayCursor("user"),
              completeReplayEvents(["user-return", "all-wait-user"]),
              setReplayCursor(cursorAt("all", "all-wait-settings", "blocked")),
            ),
          );
        }
      },
      function* loadSettings(): RiteCoroutine<string> {
        yield* emit(
          replayTrace(
            setReplayCursors([
              cursorAt("all", ["all-wait-user", "all-wait-settings"], "blocked"),
              cursorAt("settings", "settings-sleep", "running"),
            ]),
          ),
        );
        yield* sleep(settingsDelayMs);
        yield* emit(
          replayTrace(
            setReplayCursor(cursorAt("settings", ["settings-return", "settings-close"], "running")),
          ),
        );
        try {
          return "settings";
        } finally {
          yield* emit(
            replayTrace(
              clearReplayCursor("settings"),
              completeReplayEvents(["settings-return", "all-wait-settings"]),
            ),
          );
        }
      },
    ] as const);

    yield* emit(replayTrace(setReplayCursor(cursorAt("root", "wait-all", "blocked"))));
    const [user, settings] = yield* wait(pageData);
    yield* emit(
      replayTrace(
        clearReplayCursor("all"),
        completeReplayEvents("wait-all"),
        setReplayCursor(cursorAt("root", "return-page", "running")),
      ),
    );

    try {
      return { settings, user };
    } finally {
      yield* emit(replayTrace(clearReplayCursor("root"), completeReplayEvents("done")));
    }
  });
}

export interface AllResultsDemoResult {
  settings: string;
  user: string;
}

export type AllResultsDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createAllResultsDemoCode>,
  "all-wait-settings" | "all-wait-user" | "launch-settings" | "launch-user"
>;

const userDelayMs = 1000;
const settingsDelayMs = 2000;
