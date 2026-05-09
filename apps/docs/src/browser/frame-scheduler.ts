import { ChannelError, feed } from "@shajara/host";
import { receive, spawn, tryReceive } from "@shajara/host/primitives";
import type { ChannelReceiver } from "@shajara/host/primitives";
import type { RiteCoroutine } from "@shajara/host";
import { nextAnimationFrame } from "./animation-frame";

export interface FrameScheduler {
  schedule(task: FrameTask): void;
}

type FrameTask = () => void;

export function* createFrameScheduler(): RiteCoroutine<FrameScheduler> {
  const { receiver, trySend } = yield* feed<FrameTask, never>(FRAME_QUEUE_CAPACITY, keepLatest);

  yield* spawn(() => runFrames(receiver));

  return {
    schedule(task) {
      trySchedule(trySend, task);
    },
  };
}

function* runFrames(receiver: ChannelReceiver<FrameTask, never>): RiteCoroutine<void> {
  for (;;) {
    let task = yield* receive(receiver);

    yield* nextAnimationFrame();
    task = yield* readLatest(receiver, task);
    task();
  }
}

function* readLatest(
  receiver: ChannelReceiver<FrameTask, never>,
  task: FrameTask,
): RiteCoroutine<FrameTask> {
  const [hasNext, nextTask] = yield* tryReceive(receiver);

  return hasNext ? nextTask : task;
}

function trySchedule(trySend: (task: FrameTask) => boolean, task: FrameTask): void {
  try {
    trySend(task);
  } catch (error) {
    if (!(error instanceof ChannelError)) {
      throw error;
    }
  }
}

function keepLatest(_buffer: readonly FrameTask[], incoming: FrameTask): readonly FrameTask[] {
  return [incoming];
}

const FRAME_QUEUE_CAPACITY = 1;
