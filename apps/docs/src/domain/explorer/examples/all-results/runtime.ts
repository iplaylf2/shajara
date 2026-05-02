// oxlint-disable max-lines-per-function
import { all, branch, wait } from "@shajara/host/primitives";
import {
  clearCursor,
  codeLine,
  codeSpacer,
  completeEvents,
  cursorAt,
  setCursor,
  setCursors,
} from "#/domain/explorer/examples-kit";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createAllResultsDemoCode() {
  return [
    codeLine("function-open", "function* renderDashboard() {", ["done"]),
    codeLine("all-open", "  const pageData = yield* all([", ["wait-all"]),
    codeLine("user-open", "    function* loadUser() {", ["user-return"]),
    codeLine("user-sleep", `      yield* sleep(${USER_DELAY_MS});`, ["user-return"]),
    codeLine("user-return", '      return "user";', ["user-return"]),
    codeLine("user-close", "    },", ["user-return"]),
    codeSpacer(),
    codeLine("settings-open", "    function* loadSettings() {", ["settings-return"]),
    codeLine("settings-sleep", `      yield* sleep(${SETTINGS_DELAY_MS});`, ["settings-return"]),
    codeLine("settings-return", '      return "settings";', ["settings-return"]),
    codeLine("settings-close", "    },", ["settings-return"]),
    codeLine("all-close", "  ] as const);", ["wait-all"]),
    codeSpacer(),
    codeLine("wait-all", "  const [user, settings] = yield* wait(pageData);", ["wait-all"]),
    codeLine("return-page", "  return { user, settings };", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* allResultsDemo(
  emit: ExplorerReplayEmit<AllResultsDemoEvent>,
): RiteCoroutine<AllResultsDemoResult> {
  return yield* branch(function* renderDashboard(): RiteCoroutine<AllResultsDemoResult> {
    emit({
      actions: [
        setCursors([
          cursorAt("root", "all-open", "running"),
          cursorAt("all", ["launch-user", "launch-settings"], "running"),
        ]),
      ],
    });
    const pageData = yield* all([
      function* loadUser(): RiteCoroutine<string> {
        emit({
          actions: [
            setCursors([
              cursorAt("all", ["all-wait-user", "all-wait-settings"], "blocked"),
              cursorAt("user", "user-sleep", "running"),
            ]),
          ],
        });
        yield* sleep(USER_DELAY_MS);
        emit({
          actions: [setCursor(cursorAt("user", ["user-return", "user-close"], "running"))],
        });
        try {
          return "user";
        } finally {
          emit({
            actions: [
              clearCursor("user"),
              completeEvents(["user-return", "all-wait-user"]),
              setCursor(cursorAt("all", "all-wait-settings", "blocked")),
            ],
          });
        }
      },
      function* loadSettings(): RiteCoroutine<string> {
        emit({
          actions: [
            setCursors([
              cursorAt("all", ["all-wait-user", "all-wait-settings"], "blocked"),
              cursorAt("settings", "settings-sleep", "running"),
            ]),
          ],
        });
        yield* sleep(SETTINGS_DELAY_MS);
        emit({
          actions: [
            setCursor(cursorAt("settings", ["settings-return", "settings-close"], "running")),
          ],
        });
        try {
          return "settings";
        } finally {
          emit({
            actions: [
              clearCursor("settings"),
              completeEvents(["settings-return", "all-wait-settings"]),
            ],
          });
        }
      },
    ] as const);

    emit({ actions: [setCursor(cursorAt("root", "wait-all", "blocked"))] });
    const [user, settings] = yield* wait(pageData);
    emit({
      actions: [
        clearCursor("all"),
        completeEvents("wait-all"),
        setCursor(cursorAt("root", "return-page", "running")),
      ],
    });

    try {
      return { settings, user };
    } finally {
      emit({ actions: [clearCursor("root"), completeEvents("done")] });
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

const USER_DELAY_MS = 1000;
const SETTINGS_DELAY_MS = 2000;
