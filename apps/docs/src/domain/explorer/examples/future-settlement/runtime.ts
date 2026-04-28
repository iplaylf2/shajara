// oxlint-disable max-lines-per-function
import {
  clearReplayCursor,
  codeLine,
  completeReplayEvents,
  cursorAt,
  setReplayCursor,
} from "#/domain/explorer/examples-kit";
import { enclose, future, settle, spawn, wait } from "@shajara/host/primitives";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
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
    yield* emit({ actions: [setReplayCursor(cursorAt("root", "future", "running"))] });
    const [smsCode, provideSmsCode] = yield* future<string>();
    yield* emit({
      actions: [
        completeReplayEvents("future"),
        setReplayCursor(cursorAt("root", "spawn-resolver", "running")),
      ],
    });
    yield* spawn(function* receiveSmsCode(): RiteCoroutine<void> {
      yield* emit({
        actions: [setReplayCursor(cursorAt("resolver", "resolver-sleep", "running"))],
      });
      yield* sleep(resolverDelayMs);
      yield* emit({
        actions: [
          setReplayCursor(cursorAt("resolver", ["settle-code", "resolver-close"], "running")),
        ],
      });
      yield* settle(provideSmsCode, "4921");
      yield* emit({
        actions: [clearReplayCursor("resolver"), completeReplayEvents("settle-code")],
      });
    });

    yield* emit({ actions: [setReplayCursor(cursorAt("root", "wait-code", "blocked"))] });
    const code = yield* wait(smsCode);
    yield* emit({
      actions: [
        completeReplayEvents("wait-code"),
        setReplayCursor(cursorAt("root", "done", "running")),
      ],
    });

    try {
      return code;
    } finally {
      yield* emit({ actions: [clearReplayCursor("root"), completeReplayEvents("done")] });
    }
  });
}

export type FutureSettlementDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createFutureSettlementDemoCode>
>;

const resolverDelayMs = 1000;
