// oxlint-disable max-lines-per-function
import { channel, enclose, receive, send, spawn } from "@shajara/host/primitives";
import {
  clearCursor,
  codeLine,
  completeEvents,
  cursorAt,
  setCursor,
} from "#/domain/explorer/examples-kit";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createBoundedChannelDemoCode() {
  return [
    codeLine("routine", "function* queueBatches() {", ["done"]),
    codeLine(
      "channel-open",
      `  const [receiver, sender] = yield* channel<string, never>(${channelCapacity});`,
      ["channel-open"],
    ),
    codeLine("spawn-worker", "  yield* spawn(function* writeBatches() {", ["worker-return"]),
    codeLine("receive-first", "    const first = yield* receive(receiver);", ["worker-return"]),
    codeLine("worker-sleep", `    yield* sleep(${workerDelayMs});`, ["worker-return"]),
    codeLine("receive-second", "    const second = yield* receive(receiver);", ["worker-return"]),
    codeLine("receive-third", "    const third = yield* receive(receiver);", ["worker-return"]),
    codeLine("receive-fourth", "    const fourth = yield* receive(receiver);", ["worker-return"]),
    codeLine("worker-return", "    return [first, second, third, fourth];", ["worker-return"]),
    codeLine("worker-close", "  });", ["worker-return"]),
    codeLine("send-first", '  yield* send(sender, "draft");', ["send-first"]),
    codeLine("send-second", '  yield* send(sender, "review");', ["second-sent"]),
    codeLine("send-third", '  yield* send(sender, "publish");', ["third-sent"]),
    codeLine("sender-sleep", `  yield* sleep(${senderDelayMs});`, ["sender-sleep"]),
    codeLine("send-fourth", '  yield* send(sender, "archive");', ["send-fourth"]),
    codeLine("done-return", `  return ${batchCount};`, ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* boundedChannelDemo(
  emit: ExplorerReplayEmit<BoundedChannelDemoEvent>,
): RiteCoroutine<number> {
  return yield* enclose(function* queueBatches(): RiteCoroutine<number> {
    yield* emit({ actions: [setCursor(cursorAt("root", "channel-open", "running"))] });
    const [receiver, sender] = yield* channel<string, never>(channelCapacity);
    yield* emit({
      actions: [
        completeEvents("channel-open"),
        setCursor(cursorAt("root", "spawn-worker", "running")),
      ],
    });
    yield* spawn(function* writeBatches(): RiteCoroutine<readonly string[]> {
      yield* emit({ actions: [setCursor(cursorAt("worker", "receive-first", "running"))] });
      const first = yield* receive(receiver);
      yield* emit({
        actions: [
          completeEvents("receive-first"),
          setCursor(cursorAt("worker", "worker-sleep", "running")),
        ],
      });
      yield* sleep(workerDelayMs);
      yield* emit({ actions: [setCursor(cursorAt("worker", "receive-second", "running"))] });
      const second = yield* receive(receiver);
      yield* emit({
        actions: [
          completeEvents("receive-second"),
          setCursor(cursorAt("worker", "receive-third", "running")),
        ],
      });
      const third = yield* receive(receiver);
      yield* emit({
        actions: [
          completeEvents("receive-third"),
          setCursor(cursorAt("worker", "receive-fourth", "blocked")),
        ],
      });
      const fourth = yield* receive(receiver);
      yield* emit({
        actions: [
          completeEvents("receive-fourth"),
          setCursor(cursorAt("worker", ["worker-return", "worker-close"], "running")),
        ],
      });

      try {
        return [first, second, third, fourth];
      } finally {
        yield* emit({
          actions: [clearCursor("worker"), completeEvents("worker-return")],
        });
      }
    });

    yield* emit({ actions: [setCursor(cursorAt("root", "send-first", "running"))] });
    yield* send(sender, "draft");
    yield* emit({
      actions: [
        completeEvents("send-first"),
        setCursor(cursorAt("root", "send-second", "blocked")),
      ],
    });
    yield* send(sender, "review");
    yield* emit({
      actions: [
        completeEvents("second-sent"),
        setCursor(cursorAt("root", "send-third", "blocked")),
      ],
    });
    yield* send(sender, "publish");
    yield* emit({
      actions: [
        completeEvents("third-sent"),
        setCursor(cursorAt("root", "sender-sleep", "running")),
      ],
    });
    yield* sleep(senderDelayMs);
    yield* emit({
      actions: [
        completeEvents("sender-sleep"),
        setCursor(cursorAt("root", "send-fourth", "running")),
      ],
    });
    yield* send(sender, "archive");
    yield* emit({
      actions: [
        completeEvents("send-fourth"),
        setCursor(cursorAt("root", "done-return", "running")),
      ],
    });

    try {
      return batchCount;
    } finally {
      yield* emit({ actions: [clearCursor("root"), completeEvents("done")] });
    }
  });
}

export type BoundedChannelDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createBoundedChannelDemoCode>
>;

const batchCount = 4;
const channelCapacity = 1;
const senderDelayMs = 1000;
const workerDelayMs = 1000;
