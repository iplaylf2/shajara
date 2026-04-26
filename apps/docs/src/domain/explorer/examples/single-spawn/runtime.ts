// oxlint-disable max-lines-per-function
import type {
  ExplorerExampleCodeLine,
  ExplorerReplayCursor,
  ExplorerReplayEmit,
} from "#/domain/explorer/contract";
import { enclose, spawn } from "@shajara/host/primitives";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

export function createSingleSpawnDemoCode(): readonly ExplorerExampleCodeLine<SingleSpawnDemoEvent>[] {
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
): RiteCoroutine<SingleSpawnDemoResult> {
  return yield* enclose(function* submitOrder(): RiteCoroutine<SingleSpawnDemoResult> {
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
          clearCursor: "receipt",
          completed: "receipt-return",
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
        clearCursor: "root",
        completed: "done",
      });
    }
  });
}

export type SingleSpawnDemoResult = string;

const receiptDelayMs = 1000;

const singleSpawnDemoLineIds = [
  "routine",
  "spawn-receipt",
  "receipt-sleep",
  "receipt-return",
  "receipt-close",
  "return-accepted",
  "done",
] as const;

export type SingleSpawnDemoEvent = (typeof singleSpawnDemoLineIds)[number];

function codeLine(
  id: SingleSpawnDemoEvent,
  text: string,
  completedEvents?: readonly SingleSpawnDemoEvent[],
): ExplorerExampleCodeLine<SingleSpawnDemoEvent> {
  if (!completedEvents) {
    return { id, text };
  }

  return { completedEvents, id, text };
}

function cursorAt(
  routineId: string,
  event: SingleSpawnDemoEvent | readonly SingleSpawnDemoEvent[],
  mode: ExplorerReplayCursor<SingleSpawnDemoEvent>["mode"],
): ExplorerReplayCursor<SingleSpawnDemoEvent> {
  return {
    events: typeof event === "string" ? [event] : event,
    mode,
    routineId,
  };
}
