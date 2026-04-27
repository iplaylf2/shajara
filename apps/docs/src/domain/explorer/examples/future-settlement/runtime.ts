// oxlint-disable max-lines-per-function
import { codeLine, cursorAt } from "#/domain/explorer/examples-kit";
import { enclose, future, settle, spawn, wait } from "@shajara/host/primitives";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createFutureSettlementDemoCode() {
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
): RiteCoroutine<string> {
  return yield* enclose(function* verifyPhoneNumber(): RiteCoroutine<string> {
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
      yield* settle(provideSmsCode, "4921");
      yield* emit({
        clearCursor: "resolver",
        completed: "settle-code",
      });
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

export type FutureSettlementDemoEvent = ReturnType<
  typeof createFutureSettlementDemoCode
>[number]["id"];

const resolverDelayMs = 1000;
