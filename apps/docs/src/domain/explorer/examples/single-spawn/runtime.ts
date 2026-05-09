// oxlint-disable max-lines-per-function
import { branch, spawn } from "@shajara/host/primitives";
import {
  clearCursor,
  codeLine,
  codeSpacer,
  completeEvents,
  cursorAt,
  setCursor,
} from "#/domain/explorer/examples-kit";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createSingleSpawnDemoCode() {
  return [
    codeLine("function-open", "function* submitOrder() {", ["done"]),
    codeLine("spawn-receipt", "  yield* spawn(function* sendReceiptEmail() {", ["done"]),
    codeLine("receipt-sleep", `    yield* sleep(${RECEIPT_DELAY_MS});`, ["receipt-return"]),
    codeLine("receipt-return", '    return "receipt sent";', ["receipt-return"]),
    codeLine("receipt-close", "  });", ["receipt-return"]),
    codeSpacer(),
    codeLine("return-accepted", '  return "order accepted";', ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* singleSpawnDemo(
  emit: ExplorerReplayEmit<SingleSpawnDemoEvent>,
): RiteCoroutine<string> {
  return yield* branch(function* submitOrder(): RiteCoroutine<string> {
    emit({ actions: [setCursor(cursorAt("root", "spawn-receipt", "running"))] });
    yield* spawn(function* sendReceiptEmail(): RiteCoroutine<string> {
      emit({ actions: [setCursor(cursorAt("receipt", "receipt-sleep", "running"))] });
      yield* sleep(RECEIPT_DELAY_MS);
      emit({
        actions: [setCursor(cursorAt("receipt", ["receipt-return", "receipt-close"], "running"))],
      });
      try {
        return "receipt sent";
      } finally {
        emit({
          actions: [clearCursor("receipt"), completeEvents("receipt-return")],
        });
      }
    });

    emit({ actions: [setCursor(cursorAt("root", "return-accepted", "running"))] });

    try {
      return "order accepted";
    } finally {
      emit({ actions: [clearCursor("root"), completeEvents("done")] });
    }
  });
}

export type SingleSpawnDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createSingleSpawnDemoCode>
>;

const RECEIPT_DELAY_MS = 1000;
