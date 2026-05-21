// oxlint-disable max-lines-per-function
import { branch, guard, resumable } from "@shajara/host/primitives";
import {
  branchWait,
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
export function createRecoveryBoundaryDemoCode() {
  return [
    codeLine("function-open", "function* publishListing() {", ["done"]),
    codeLine("guard-open", "  yield* guard(", ["guard-wait-root", "guard-closed"]),
    codeLine("entry-open", "    function* reviewListing() {", ["entry-apply"]),
    codeLine("resumable-open", "      const approval = yield* resumable(", ["resumable-wait"]),
    codeLine("scan-open", "        function* scanPhotos() {", ["scan-throw"]),
    codeLine("scan-sleep", `          yield* sleep(${SCAN_DELAY_MS});`, ["scan-throw"]),
    codeLine("scan-throw", '          throw new Error("scanner offline");', ["scan-throw"]),
    codeLine("scan-close", "        },", ["scan-throw"]),
    codeLine("resumable-close", "      );", ["resumable-wait"]),
    codeSpacer(),
    codeLine("entry-apply", "      yield* recordApproval(approval);", ["entry-apply"]),
    codeLine("entry-close", "    },", ["entry-apply"]),
    codeSpacer(),
    codeLine("handler-open", "    function* approveManually(error) {", ["handler-return"]),
    codeLine("handler-sleep", `      yield* sleep(${MANUAL_APPROVAL_DELAY_MS});`, [
      "handler-return",
    ]),
    codeLine("handler-return", `      return [true, \`manual approval: \${error.kind}\`];`, [
      "handler-return",
    ]),
    codeLine("handler-close", "    },", ["handler-return"]),
    codeLine("guard-close", "  );", ["guard-wait-root", "guard-closed"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* recoveryBoundaryDemo(
  emit: ExplorerReplayEmit<RecoveryBoundaryDemoEvent>,
): RiteCoroutine<void> {
  return yield* branch(function* publishListing(): RiteCoroutine<void> {
    emit({
      actions: [setCursor(cursorAt("root", ["guard-open", "launch-guard"], "running"))],
    });
    yield* guard(
      branchWait(
        emit,
        { events: ["guard-open", "guard-wait-root"], targetId: "root" },
        function* reviewListing(): RiteCoroutine<void> {
          emit({
            actions: [setCursor(cursorAt("review", ["resumable-open", "launch-scan"], "running"))],
          });
          const approval = yield* resumable(function* scanPhotos(): RiteCoroutine<string> {
            emit({
              actions: [
                setCursors([
                  cursorAt("review", ["resumable-open", "resumable-wait"], "blocked"),
                  cursorAt("scan", "scan-sleep", "running"),
                ]),
              ],
            });
            yield* sleep(SCAN_DELAY_MS);
            emit({
              actions: [setCursor(cursorAt("scan", ["scan-throw", "request-recovery"], "running"))],
            });
            try {
              throw new Error("scanner offline");
            } catch (error) {
              emit({
                actions: [clearCursor("scan"), completeEvents("scan-throw")],
              });
              throw error;
            }
          });

          emit({
            actions: [
              completeEvents("resumable-wait"),
              setCursor(cursorAt("review", "entry-apply", "running")),
            ],
          });

          try {
            yield* recordApproval(approval);
          } finally {
            emit({
              actions: [
                clearCursor("review"),
                completeEvents("entry-apply"),
                setCursor(cursorAt("guard-scope", "guard-closing", "blocked")),
              ],
            });
          }
        },
      ),
      function* approveManually(error): RiteCoroutine<readonly [true, string]> {
        emit({
          actions: [
            completeEvents("request-recovery"),
            setCursor(cursorAt("approval", "handler-sleep", "running")),
          ],
        });
        yield* sleep(MANUAL_APPROVAL_DELAY_MS);
        emit({
          actions: [
            setCursor(cursorAt("approval", ["handler-return", "apply-recovery"], "running")),
          ],
        });

        try {
          return [true, `manual approval: ${error.kind}`];
        } finally {
          emit({
            actions: [
              clearCursor("approval"),
              completeEvents(["handler-return", "apply-recovery"]),
            ],
          });
        }
      },
    );

    emit({
      actions: [
        clearCursor("guard-scope"),
        clearCursor("root"),
        completeEvents(["guard-wait-root", "guard-closed", "done"]),
      ],
    });
  });
}

export type RecoveryBoundaryDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createRecoveryBoundaryDemoCode>,
  | "apply-recovery"
  | "guard-closing"
  | "guard-closed"
  | "guard-wait-root"
  | "launch-scan"
  | "launch-guard"
  | "request-recovery"
  | "resumable-wait"
>;

const MANUAL_APPROVAL_DELAY_MS = 1000;
const RECORD_APPROVAL_DELAY_MS = 600;
const SCAN_DELAY_MS = 1000;

function* recordApproval(_approval: string): RiteCoroutine<void> {
  yield* sleep(RECORD_APPROVAL_DELAY_MS);
}
