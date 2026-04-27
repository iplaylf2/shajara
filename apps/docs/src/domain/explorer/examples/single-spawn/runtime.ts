// oxlint-disable max-lines-per-function
import { codeLine, cursorAt } from "#/domain/explorer/examples-kit";
import { enclose, spawn } from "@shajara/host/primitives";
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
    codeLine("return-accepted", '  return "order accepted";', ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* singleSpawnDemo(
  emit: ExplorerReplayEmit<SingleSpawnDemoEvent>,
): RiteCoroutine<string> {
  return yield* enclose(function* submitOrder(): RiteCoroutine<string> {
    yield* emit({
      cursor: cursorAt("root", "spawn-receipt", "running"),
    });
    yield* spawn(function* sendReceiptEmail(): RiteCoroutine<string> {
      yield* emit({
        cursor: cursorAt("receipt", "receipt-sleep", "running"),
      });
      yield* sleep(receiptDelayMs);
      yield* emit({
        cursor: cursorAt("receipt", ["receipt-return", "receipt-close"], "running"),
      });
      try {
        return "receipt sent";
      } finally {
        yield* emit({
          clearCursors: ["receipt", "root"],
          completed: ["receipt-return", "wait-receipt", "done"],
        });
      }
    });

    yield* emit({
      cursor: cursorAt("root", "return-accepted", "running"),
    });

    try {
      return "order accepted";
    } finally {
      yield* emit({
        cursor: cursorAt("root", "wait-receipt", "blocked"),
      });
    }
  });
}

export type SingleSpawnDemoEvent =
  | ReturnType<typeof createSingleSpawnDemoCode>[number]["id"]
  | "wait-receipt";

const receiptDelayMs = 1000;
