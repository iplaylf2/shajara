// oxlint-disable max-lines-per-function
import { channel, enclose, receive, send, spawn } from "@shajara/host/primitives";
import {
  clearReplayCursor,
  codeLine,
  completeReplayEvents,
  cursorAt,
  replayTrace,
  setReplayCursor,
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
    codeLine("worker-sleep", `    yield* sleep(${workerDelayMs});`, ["worker-return"]),
    codeLine("receive-first", "    const first = yield* receive(receiver);", ["worker-return"]),
    codeLine("receive-second", "    const second = yield* receive(receiver);", ["worker-return"]),
    codeLine("receive-third", "    const third = yield* receive(receiver);", ["worker-return"]),
    codeLine("worker-return", "    return [first, second, third];", ["worker-return"]),
    codeLine("worker-close", "  });", ["worker-return"]),
    codeLine("send-first", '  yield* send(sender, "draft");', ["send-first"]),
    codeLine("send-second", '  yield* send(sender, "review");', ["second-sent"]),
    codeLine("sender-sleep", `  yield* sleep(${senderDelayMs});`, ["sender-sleep"]),
    codeLine("send-third", '  yield* send(sender, "publish");', ["send-third"]),
    codeLine("done-return", `  return ${batchCount};`, ["done"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* boundedChannelDemo(
  emit: ExplorerReplayEmit<BoundedChannelDemoEvent>,
): RiteCoroutine<number> {
  return yield* enclose(function* queueBatches(): RiteCoroutine<number> {
    yield* emit(replayTrace(setReplayCursor(cursorAt("root", "channel-open", "running"))));
    const [receiver, sender] = yield* channel<string, never>(channelCapacity);
    yield* emit(
      replayTrace(
        completeReplayEvents("channel-open"),
        setReplayCursor(cursorAt("root", "spawn-worker", "running")),
      ),
    );
    yield* spawn(function* writeBatches(): RiteCoroutine<readonly string[]> {
      yield* emit(replayTrace(setReplayCursor(cursorAt("worker", "worker-sleep", "running"))));
      yield* sleep(workerDelayMs);
      yield* emit(replayTrace(setReplayCursor(cursorAt("worker", "receive-first", "running"))));
      const first = yield* receive(receiver);
      yield* emit(
        replayTrace(
          completeReplayEvents("receive-first"),
          setReplayCursor(cursorAt("worker", "receive-second", "blocked")),
        ),
      );
      const second = yield* receive(receiver);
      yield* emit(
        replayTrace(
          completeReplayEvents("receive-second"),
          setReplayCursor(cursorAt("worker", "receive-third", "blocked")),
        ),
      );
      const third = yield* receive(receiver);
      yield* emit(
        replayTrace(
          completeReplayEvents("receive-third"),
          setReplayCursor(cursorAt("worker", ["worker-return", "worker-close"], "running")),
        ),
      );

      try {
        return [first, second, third];
      } finally {
        yield* emit(
          replayTrace(clearReplayCursor("worker"), completeReplayEvents("worker-return")),
        );
      }
    });

    yield* emit(replayTrace(setReplayCursor(cursorAt("root", "send-first", "running"))));
    yield* send(sender, "draft");
    yield* emit(
      replayTrace(
        completeReplayEvents("send-first"),
        setReplayCursor(cursorAt("root", "send-second", "blocked")),
      ),
    );
    yield* send(sender, "review");
    yield* emit(
      replayTrace(
        completeReplayEvents("second-sent"),
        setReplayCursor(cursorAt("root", "sender-sleep", "running")),
      ),
    );
    yield* sleep(senderDelayMs);
    yield* emit(
      replayTrace(
        completeReplayEvents("sender-sleep"),
        setReplayCursor(cursorAt("root", "send-third", "running")),
      ),
    );
    yield* send(sender, "publish");
    yield* emit(
      replayTrace(
        completeReplayEvents("send-third"),
        setReplayCursor(cursorAt("root", "done-return", "running")),
      ),
    );

    try {
      return batchCount;
    } finally {
      yield* emit(replayTrace(clearReplayCursor("root"), completeReplayEvents("done")));
    }
  });
}

export type BoundedChannelDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createBoundedChannelDemoCode>
>;

const batchCount = 3;
const channelCapacity = 1;
const senderDelayMs = 1000;
const workerDelayMs = 1000;
