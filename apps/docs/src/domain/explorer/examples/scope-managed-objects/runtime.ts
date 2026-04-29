// oxlint-disable max-lines-per-function sort-imports
import {
  clearCursor,
  clearCursors,
  codeLine,
  codeSpacer,
  completeEvents,
  cursorAt,
  encloseWait,
  setCursor,
} from "#/domain/explorer/examples-kit";
import { CanceledError, ChannelError, sleep } from "@shajara/host";
import { channel, enclose, future, tryReceive, wait } from "@shajara/host/primitives";
import type { RiteCoroutine, RiteFuture } from "@shajara/host";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";

// oxlint-disable-next-line explicit-module-boundary-types
export function createScopeManagedObjectsDemoCode() {
  return [
    codeLine("routine", "function* resumeCheckout() {", ["done"]),
    codeLine(
      "enclose-open",
      "  const [ticket, updates] = yield* enclose(function* openSession() {",
      ["objects-returned", "scope-closed"],
    ),
    codeLine("future-open", "    const [ticket] = yield* future<string>();", ["future-open"]),
    codeLine(
      "channel-open",
      `    const [updates] = yield* channel<string, never>(${channelCapacity});`,
      ["channel-open"],
    ),
    codeLine("session-sleep", `    yield* sleep(${sessionDelayMs});`, ["session-sleep"]),
    codeLine("return-objects", "    return [ticket, updates];", ["return-objects"]),
    codeLine("enclose-close", "  });", ["objects-returned", "scope-closed"]),
    codeLine("after-enclose-sleep", `  yield* sleep(${afterEncloseDelayMs});`, [
      "after-enclose-sleep",
    ]),
    codeSpacer(),
    codeLine("wait-ticket", "  try { yield* wait(ticket); }", ["ticket-caught"]),
    codeLine("ticket-caught", "  catch (error) { observeCanceled(error); }", ["ticket-caught"]),
    codeLine("object-sleep", `  yield* sleep(${objectDelayMs});`, ["object-sleep"]),
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
  return yield* enclose(function* resumeCheckout(): RiteCoroutine<string> {
    yield* emit({
      actions: [setCursor(cursorAt("root", ["enclose-open", "launch-scope"], "running"))],
    });
    const [ticket, updates] = yield* enclose(
      encloseWait(
        emit,
        { events: ["enclose-open", "scope-wait-root"], routineId: "root" },
        function* openSession(): RiteCoroutine<SessionObjects> {
          yield* emit({
            actions: [setCursor(cursorAt("child", "future-open", "running"))],
          });
          const [createdTicket] = yield* future<string>();
          yield* emit({
            actions: [
              completeEvents("future-open"),
              setCursor(cursorAt("child", "channel-open", "running")),
            ],
          });
          const [createdUpdates] = yield* channel<string, never>(channelCapacity);
          yield* emit({
            actions: [
              completeEvents("channel-open"),
              setCursor(cursorAt("child", "session-sleep", "running")),
            ],
          });
          yield* sleep(sessionDelayMs);
          yield* emit({
            actions: [
              completeEvents("session-sleep"),
              setCursor(cursorAt("child", "return-objects", "running")),
            ],
          });

          try {
            return [createdTicket, createdUpdates] as const;
          } finally {
            yield* emit({ actions: [completeEvents("return-objects")] });
          }
        },
      ),
    );

    yield* emit({
      actions: [
        clearCursor("child"),
        completeEvents([
          "objects-returned",
          "scope-wait-root",
          "scope-closed",
          "ticket-canceled",
          "updates-revoked",
        ]),
        setCursor(cursorAt("root", "after-enclose-sleep", "running")),
      ],
    });

    yield* sleep(afterEncloseDelayMs);
    yield* emit({
      actions: [
        completeEvents("after-enclose-sleep"),
        setCursor(cursorAt("root", "wait-ticket", "running")),
      ],
    });

    try {
      yield* wait(ticket);
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        throw error;
      }

      yield* emit({
        actions: [
          completeEvents("ticket-caught"),
          setCursor(cursorAt("root", "object-sleep", "running")),
        ],
      });
    }

    yield* sleep(objectDelayMs);
    yield* emit({
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

      yield* emit({
        actions: [
          completeEvents("updates-caught"),
          setCursor(cursorAt("root", "return-result", "running")),
        ],
      });
    }

    try {
      return "owned objects closed";
    } finally {
      yield* emit({ actions: [clearCursors(["root", "child"]), completeEvents("done")] });
    }
  });
}

export type ScopeManagedObjectsDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createScopeManagedObjectsDemoCode>,
  | "objects-returned"
  | "object-sleep"
  | "after-enclose-sleep"
  | "launch-scope"
  | "scope-closed"
  | "scope-wait-root"
  | "ticket-canceled"
  | "updates-revoked"
>;

type ManagedReceiver = Parameters<typeof tryReceive<string, never>>[typeof firstParameterIndex];

type SessionObjects = readonly [RiteFuture<string>, ManagedReceiver];

const channelCapacity = 0;
const afterEncloseDelayMs = 1000;
const firstParameterIndex = 0;
const objectDelayMs = 1000;
const sessionDelayMs = 1000;
