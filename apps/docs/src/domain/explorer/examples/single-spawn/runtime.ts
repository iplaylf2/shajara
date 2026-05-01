// oxlint-disable max-lines-per-function
import { branch, spawn } from "@shajara/host/primitives";
import {
  clearCursors,
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
    codeLine("routine", "function* submitOrder() {", ["done"]),
    codeLine("spawn-receipt", "  yield* spawn(function* sendReceiptEmail() {", ["done"]),
    codeLine("receipt-sleep", `    yield* sleep(${receiptDelayMs});`, ["receipt-return"]),
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
      yield* sleep(receiptDelayMs);
      emit({
        actions: [setCursor(cursorAt("receipt", ["receipt-return", "receipt-close"], "running"))],
      });
      try {
        return "receipt sent";
      } finally {
        emit({
          actions: [
            clearCursors(["receipt", "root"]),
            completeEvents(["receipt-return", "wait-receipt", "done"]),
          ],
        });
      }
    });

    emit({ actions: [setCursor(cursorAt("root", "return-accepted", "running"))] });

    try {
      return "order accepted";
    } finally {
      emit({ actions: [setCursor(cursorAt("root", "wait-receipt", "blocked"))] });
    }
  });
}

export type SingleSpawnDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createSingleSpawnDemoCode>,
  "wait-receipt"
>;

const receiptDelayMs = 1000;
