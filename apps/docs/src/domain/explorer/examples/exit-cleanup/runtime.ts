// oxlint-disable max-lines-per-function
import {
  clearCursor,
  clearCursors,
  codeLine,
  codeSpacer,
  completeEvents,
  cursorAt,
  encloseWait,
  setCursor,
  setCursors,
} from "#/domain/explorer/examples-kit";
import { defer, enclose } from "@shajara/host/primitives";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createExitCleanupDemoCode() {
  return [
    codeLine("routine", "function* shipOrder() {", ["done"]),
    codeLine("enclose-open", "  const parcel = yield* enclose(function* packParcel() {", [
      "enclose-close",
    ]),
    codeLine("defer-open", "    yield* defer(function* releaseBench() {", ["defer-registered"]),
    codeLine("defer-sleep", `      yield* sleep(${cleanupDelayMs});`, ["defer-cleaned"]),
    codeLine("defer-close", "    });", ["defer-cleaned"]),
    codeSpacer(),
    codeLine("pack-sleep", `    yield* sleep(${packingDelayMs});`, ["pack-sleep"]),
    codeLine("inner-return", '    return "packed parcel";', ["inner-return"]),
    codeLine("enclose-close", "  });", ["enclose-close"]),
    codeSpacer(),
    codeLine("return-result", "  return parcel;", ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* exitCleanupDemo(
  emit: ExplorerReplayEmit<ExitCleanupDemoEvent>,
): RiteCoroutine<string> {
  return yield* enclose(function* shipOrder(): RiteCoroutine<string> {
    emit({
      actions: [setCursor(cursorAt("root", ["enclose-open", "launch-scope"], "running"))],
    });
    const parcel = yield* enclose(
      encloseWait(
        emit,
        { events: ["enclose-open", "scope-wait-root"], routineId: "root" },
        function* packParcel(): RiteCoroutine<string> {
          emit({
            actions: [setCursor(cursorAt("scope", "defer-open", "running"))],
          });
          yield* defer(function* releaseBench(): RiteCoroutine<void> {
            emit({
              actions: [
                setCursors([
                  cursorAt("scope", "scope-wait-defer", "blocked"),
                  cursorAt("defer", "defer-sleep", "running"),
                ]),
              ],
            });
            yield* sleep(cleanupDelayMs);
            emit({
              actions: [
                clearCursors(["defer", "scope"]),
                completeEvents(["defer-cleaned", "scope-wait-defer"]),
              ],
            });
          });

          emit({
            actions: [
              completeEvents("defer-registered"),
              setCursor(cursorAt("scope", "pack-sleep", "running")),
            ],
          });
          yield* sleep(packingDelayMs);
          emit({
            actions: [
              completeEvents("pack-sleep"),
              setCursor(cursorAt("scope", "inner-return", "running")),
            ],
          });
          try {
            return "packed parcel";
          } finally {
            emit({ actions: [completeEvents("inner-return")] });
          }
        },
      ),
    );

    emit({
      actions: [
        clearCursor("scope"),
        completeEvents(["enclose-close", "scope-wait-root"]),
        setCursor(cursorAt("root", "return-result", "running")),
      ],
    });
    try {
      return parcel;
    } finally {
      emit({ actions: [clearCursor("root"), completeEvents("done")] });
    }
  });
}

export type ExitCleanupDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createExitCleanupDemoCode>,
  "defer-registered" | "launch-scope" | "scope-wait-defer" | "scope-wait-root"
>;

const cleanupDelayMs = 1000;
const packingDelayMs = 1000;
