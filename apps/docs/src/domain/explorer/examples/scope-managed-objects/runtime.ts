// oxlint-disable max-lines-per-function
import { CanceledError, ChannelError, sleep } from "@shajara/host";
import type { RiteCoroutine, RiteFuture } from "@shajara/host";
import { branch, channel, future, tryReceive, wait } from "@shajara/host/primitives";
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

// oxlint-disable-next-line explicit-module-boundary-types
export function createScopeManagedObjectsDemoCode() {
  return [
    codeLine("function-open", "function* resumeCheckout() {", ["done"]),
    codeLine("branch-open", "  const [ticket, updates] = yield* branch(function* openSession() {", [
      "objects-returned",
      "scope-closed",
    ]),
    codeLine("future-open", "    const [ticket] = yield* future<string>();", ["future-open"]),
    codeLine(
      "channel-open",
      `    const [updates] = yield* channel<string, never>(${CHANNEL_CAPACITY});`,
      ["channel-open"],
    ),
    codeLine("session-sleep", `    yield* sleep(${SESSION_DELAY_MS});`, ["session-sleep"]),
    codeLine("return-objects", "    return [ticket, updates];", ["return-objects"]),
    codeLine("branch-close", "  });", ["objects-returned", "scope-closed"]),
    codeLine("after-branch-sleep", `  yield* sleep(${AFTER_BRANCH_DELAY_MS});`, [
      "after-branch-sleep",
    ]),
    codeSpacer(),
    codeLine("wait-ticket", "  try { yield* wait(ticket); }", ["ticket-caught"]),
    codeLine("ticket-caught", "  catch (error) { observeCanceled(error); }", ["ticket-caught"]),
    codeLine("object-sleep", `  yield* sleep(${OBJECT_DELAY_MS});`, ["object-sleep"]),
    codeLine("receive-updates", "  try { yield* tryReceive(updates); }", ["updates-caught"]),
    codeLine("updates-caught", "  catch (error) { observeRevoked(error); }", ["updates-caught"]),
    codeSpacer(),
    codeLine("return-result", '  return "owned objects closed";', ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* scopeManagedObjectsDemo(
  emit: ExplorerReplayEmit<ScopeManagedObjectsDemoEvent>,
): RiteCoroutine<string> {
  return yield* branch(function* resumeCheckout(): RiteCoroutine<string> {
    emit({
      actions: [setCursor(cursorAt("root", ["branch-open", "launch-scope"], "running"))],
    });
    const [ticket, updates] = yield* branch(
      branchWait(
        emit,
        { events: ["branch-open", "scope-wait-root"], targetId: "root" },
        function* openSession(): RiteCoroutine<SessionObjects> {
          emit({
            actions: [setCursor(cursorAt("child", "future-open", "running"))],
          });
          const [createdTicket] = yield* future<string>();
          emit({
            actions: [
              completeEvents("future-open"),
              setCursor(cursorAt("child", "channel-open", "running")),
            ],
          });
          const [createdUpdates] = yield* channel<string, never>(CHANNEL_CAPACITY);
          emit({
            actions: [
              completeEvents("channel-open"),
              setCursor(cursorAt("child", "session-sleep", "running")),
            ],
          });
          yield* sleep(SESSION_DELAY_MS);
          emit({
            actions: [
              completeEvents("session-sleep"),
              setCursor(cursorAt("child", "return-objects", "running")),
            ],
          });

          try {
            return [createdTicket, createdUpdates] as const;
          } finally {
            emit({
              actions: [
                clearCursor("child"),
                completeEvents("return-objects"),
                setCursor(cursorAt("session-scope", "scope-closing", "blocked")),
              ],
            });
          }
        },
      ),
    );

    emit({
      actions: [
        clearCursor("session-scope"),
        completeEvents([
          "objects-returned",
          "scope-wait-root",
          "scope-closed",
          "ticket-canceled",
          "updates-revoked",
        ]),
        setCursor(cursorAt("root", "after-branch-sleep", "running")),
      ],
    });

    yield* sleep(AFTER_BRANCH_DELAY_MS);
    emit({
      actions: [
        completeEvents("after-branch-sleep"),
        setCursor(cursorAt("root", "wait-ticket", "running")),
      ],
    });

    try {
      yield* wait(ticket);
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        throw error;
      }

      emit({
        actions: [
          completeEvents("ticket-caught"),
          setCursor(cursorAt("root", "object-sleep", "running")),
        ],
      });
    }

    yield* sleep(OBJECT_DELAY_MS);
    emit({
      actions: [
        completeEvents("object-sleep"),
        setCursor(cursorAt("root", "receive-updates", "running")),
      ],
    });

    try {
      yield* tryReceive(updates);
    } catch (error) {
      if (!(error instanceof ChannelError)) {
        throw error;
      }

      emit({
        actions: [
          completeEvents("updates-caught"),
          setCursor(cursorAt("root", "return-result", "running")),
        ],
      });
    }

    try {
      return "owned objects closed";
    } finally {
      emit({ actions: [clearCursor("root"), completeEvents("done")] });
    }
  });
}

export type ScopeManagedObjectsDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createScopeManagedObjectsDemoCode>,
  | "objects-returned"
  | "object-sleep"
  | "after-branch-sleep"
  | "launch-scope"
  | "scope-closing"
  | "scope-closed"
  | "scope-wait-root"
  | "ticket-canceled"
  | "updates-revoked"
>;

type ManagedReceiver = Parameters<typeof tryReceive<string, never>>[typeof FIRST_PARAMETER_INDEX];

type SessionObjects = readonly [RiteFuture<string>, ManagedReceiver];

const CHANNEL_CAPACITY = 0;
const AFTER_BRANCH_DELAY_MS = 1000;
const FIRST_PARAMETER_INDEX = 0;
const OBJECT_DELAY_MS = 1000;
const SESSION_DELAY_MS = 1000;
