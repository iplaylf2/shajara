// oxlint-disable max-lines-per-function
import type {
  ExplorerExampleCodeLine,
  ExplorerReplayCursor,
  ExplorerReplayEmit,
} from "#/domain/explorer/contract";
import { enclose, future, settle, spawn, wait } from "@shajara/host/primitives";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

export function createFutureSettlementDemoCode(): readonly ExplorerExampleCodeLine<FutureSettlementDemoEvent>[] {
  return [
    codeLine("routine", "function* verifyPhoneNumber() {", ["done"]),
    codeLine("future", "  const [smsCode, provideSmsCode] = yield* future<string>();", ["future"]),
    codeLine("spawn-resolver", "  yield* spawn(function* receiveSmsCode() {", ["settle-code"]),
    codeLine("resolver-sleep", `    yield* sleep(${resolverDelayMs});`, ["settle-code"]),
    codeLine("settle-code", '    yield* settle(provideSmsCode, "4921");', ["settle-code"]),
    codeLine("resolver-close", "  });", ["settle-code"]),
    codeLine("wait-code", "  return yield* wait(smsCode);", ["wait-code"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* futureSettlementDemo(
  emit: ExplorerReplayEmit<FutureSettlementDemoEvent>,
): RiteCoroutine<FutureSettlementDemoResult> {
  return yield* enclose(function* verifyPhoneNumber(): RiteCoroutine<FutureSettlementDemoResult> {
    yield* emit({
      cursor: cursorAt("root", "future", "running"),
    });
    const [smsCode, provideSmsCode] = yield* future<string>();
    yield* emit({
      completed: "future",
      cursor: cursorAt("root", "spawn-resolver", "running"),
    });
    yield* spawn(function* receiveSmsCode(): RiteCoroutine<void> {
      yield* emit({
        cursor: cursorAt("resolver", "resolver-sleep", "running"),
      });
      yield* sleep(resolverDelayMs);
      yield* emit({
        cursor: cursorAt("resolver", ["settle-code", "resolver-close"], "running"),
      });
      try {
        yield* settle(provideSmsCode, "4921");
      } finally {
        yield* emit({
          clearCursor: "resolver",
          completed: "settle-code",
        });
      }
    });

    yield* emit({
      cursor: cursorAt("root", "wait-code", "blocked"),
    });
    const code = yield* wait(smsCode);
    yield* emit({
      completed: "wait-code",
      cursor: cursorAt("root", "done", "running"),
    });

    try {
      return code;
    } finally {
      yield* emit({
        clearCursor: "root",
        completed: "done",
      });
    }
  });
}

export type FutureSettlementDemoResult = string;

const resolverDelayMs = 1000;

const futureSettlementDemoLineIds = [
  "routine",
  "future",
  "spawn-resolver",
  "resolver-sleep",
  "settle-code",
  "resolver-close",
  "wait-code",
  "done",
] as const;

export type FutureSettlementDemoEvent = (typeof futureSettlementDemoLineIds)[number];

function codeLine(
  id: FutureSettlementDemoEvent,
  text: string,
  completedEvents?: readonly FutureSettlementDemoEvent[],
): ExplorerExampleCodeLine<FutureSettlementDemoEvent> {
  if (!completedEvents) {
    return { id, text };
  }

  return { completedEvents, id, text };
}

function cursorAt(
  routineId: string,
  event: FutureSettlementDemoEvent | readonly FutureSettlementDemoEvent[],
  mode: ExplorerReplayCursor<FutureSettlementDemoEvent>["mode"],
): ExplorerReplayCursor<FutureSettlementDemoEvent> {
  return {
    events: typeof event === "string" ? [event] : event,
    mode,
    routineId,
  };
}
