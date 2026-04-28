// oxlint-disable max-lines-per-function
import { channel, enclose, receive, send, spawn } from "@shajara/host/primitives";
import { codeLine, cursorAt } from "#/domain/explorer/examples-kit";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createRendezvousChannelDemoCode() {
  return [
    codeLine("routine", "function* handOffTakeout() {", ["done"]),
    codeLine(
      "channel-open",
      `  const [receiver, sender] = yield* channel<string, never>(${channelCapacity});`,
      ["channel-open"],
    ),
    codeLine("spawn-courier", "  yield* spawn(function* courierPickup() {", ["courier-return"]),
    codeLine("courier-sleep", `    yield* sleep(${courierDelayMs});`, ["courier-return"]),
    codeLine("receive-meal", "    const meal = yield* receive(receiver);", ["courier-return"]),
    codeLine("courier-return", "    return meal;", ["courier-return"]),
    codeLine("courier-close", "  });", ["courier-return"]),
    codeLine("send-meal", '  yield* send(sender, "ramen order");', ["send-done"]),
    codeLine("send-done", '  return "handed off";', ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* rendezvousChannelDemo(
  emit: ExplorerReplayEmit<RendezvousChannelDemoEvent>,
): RiteCoroutine<string> {
  return yield* enclose(function* handOffTakeout(): RiteCoroutine<string> {
    yield* emit({
      cursor: cursorAt("root", "channel-open", "running"),
    });
    const [receiver, sender] = yield* channel<string, never>(channelCapacity);
    yield* emit({
      completed: "channel-open",
      cursor: cursorAt("root", "spawn-courier", "running"),
    });
    yield* spawn(function* courierPickup(): RiteCoroutine<string> {
      yield* emit({
        cursor: cursorAt("courier", "courier-sleep", "running"),
      });
      yield* sleep(courierDelayMs);
      yield* emit({
        cursor: cursorAt("courier", "receive-meal", "running"),
      });
      const meal = yield* receive(receiver);
      yield* emit({
        completed: "receive-meal",
        cursor: cursorAt("courier", ["courier-return", "courier-close"], "running"),
      });

      try {
        return meal;
      } finally {
        yield* emit({
          clearCursor: "courier",
          completed: "courier-return",
        });
      }
    });

    yield* emit({
      cursor: cursorAt("root", "send-meal", "blocked"),
    });
    yield* send(sender, "ramen order");
    yield* emit({
      completed: "send-done",
      cursor: cursorAt("root", "send-done", "running"),
    });

    try {
      return "handed off";
    } finally {
      yield* emit({
        clearCursor: "root",
        completed: "done",
      });
    }
  });
}

export type RendezvousChannelDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createRendezvousChannelDemoCode>
>;

const channelCapacity = 0;
const courierDelayMs = 1000;
