// oxlint-disable max-lines-per-function
import { branch, channel, receive, send, spawn } from "@shajara/host/primitives";
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
export function createBoundedChannelDemoCode() {
  return [
    codeLine("function-open", "function* queueBatches() {", ["done"]),
    codeLine(
      "channel-open",
      `  const [receiver, sender] = yield* channel<string, never>(${CHANNEL_CAPACITY});`,
      ["channel-open"],
    ),
    codeSpacer(),
    codeLine("spawn-worker", "  yield* spawn(function* writeBatches() {", ["worker-return"]),
    codeLine("receive-first", "    const first = yield* receive(receiver);", ["worker-return"]),
    codeLine("worker-sleep", `    yield* sleep(${WORKER_DELAY_MS});`, ["worker-return"]),
    codeLine("receive-second", "    const second = yield* receive(receiver);", ["worker-return"]),
    codeLine("receive-third", "    const third = yield* receive(receiver);", ["worker-return"]),
    codeLine("receive-fourth", "    const fourth = yield* receive(receiver);", ["worker-return"]),
    codeLine("worker-return", "    return [first, second, third, fourth];", ["worker-return"]),
    codeLine("worker-close", "  });", ["worker-return"]),
    codeSpacer(),
    codeLine("send-first", '  yield* send(sender, "draft");', ["send-first"]),
    codeLine("send-second", '  yield* send(sender, "review");', ["second-sent"]),
    codeLine("send-third", '  yield* send(sender, "publish");', ["third-sent"]),
    codeLine("sender-sleep", `  yield* sleep(${SENDER_DELAY_MS});`, ["sender-sleep"]),
    codeLine("send-fourth", '  yield* send(sender, "archive");', ["send-fourth"]),
    codeSpacer(),
    codeLine("done-return", `  return ${BATCH_COUNT};`, ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* boundedChannelDemo(
  emit: ExplorerReplayEmit<BoundedChannelDemoEvent>,
): RiteCoroutine<number> {
  return yield* branch(function* queueBatches(): RiteCoroutine<number> {
    emit({ actions: [setCursor(cursorAt("root", "channel-open", "running"))] });
    const [receiver, sender] = yield* channel<string, never>(CHANNEL_CAPACITY);
    emit({
      actions: [
        completeEvents("channel-open"),
        setCursor(cursorAt("root", "spawn-worker", "running")),
      ],
    });
    yield* spawn(function* writeBatches(): RiteCoroutine<readonly string[]> {
      emit({ actions: [setCursor(cursorAt("worker", "receive-first", "running"))] });
      const first = yield* receive(receiver);
      emit({
        actions: [
          completeEvents("receive-first"),
          setCursor(cursorAt("worker", "worker-sleep", "running")),
        ],
      });
      yield* sleep(WORKER_DELAY_MS);
      emit({ actions: [setCursor(cursorAt("worker", "receive-second", "running"))] });
      const second = yield* receive(receiver);
      emit({
        actions: [
          completeEvents("receive-second"),
          setCursor(cursorAt("worker", "receive-third", "running")),
        ],
      });
      const third = yield* receive(receiver);
      emit({
        actions: [
          completeEvents("receive-third"),
          setCursor(cursorAt("worker", "receive-fourth", "blocked")),
        ],
      });
      const fourth = yield* receive(receiver);
      emit({
        actions: [
          completeEvents("receive-fourth"),
          setCursor(cursorAt("worker", ["worker-return", "worker-close"], "running")),
        ],
      });

      try {
        return [first, second, third, fourth];
      } finally {
        emit({
          actions: [clearCursor("worker"), completeEvents("worker-return")],
        });
      }
    });

    emit({ actions: [setCursor(cursorAt("root", "send-first", "running"))] });
    yield* send(sender, "draft");
    emit({
      actions: [
        completeEvents("send-first"),
        setCursor(cursorAt("root", "send-second", "blocked")),
      ],
    });
    yield* send(sender, "review");
    emit({
      actions: [
        completeEvents("second-sent"),
        setCursor(cursorAt("root", "send-third", "blocked")),
      ],
    });
    yield* send(sender, "publish");
    emit({
      actions: [
        completeEvents("third-sent"),
        setCursor(cursorAt("root", "sender-sleep", "running")),
      ],
    });
    yield* sleep(SENDER_DELAY_MS);
    emit({
      actions: [
        completeEvents("sender-sleep"),
        setCursor(cursorAt("root", "send-fourth", "running")),
      ],
    });
    yield* send(sender, "archive");
    emit({
      actions: [
        completeEvents("send-fourth"),
        setCursor(cursorAt("root", "done-return", "running")),
      ],
    });

    try {
      return BATCH_COUNT;
    } finally {
      emit({ actions: [clearCursor("root"), completeEvents("done")] });
    }
  });
}

export type BoundedChannelDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createBoundedChannelDemoCode>
>;

const BATCH_COUNT = 4;
const CHANNEL_CAPACITY = 1;
const SENDER_DELAY_MS = 1000;
const WORKER_DELAY_MS = 1000;
