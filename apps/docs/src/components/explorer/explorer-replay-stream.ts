import type {
  ExplorerReplayCursor,
  ExplorerReplayFrame,
  ExplorerReplayState,
} from "#/domain/explorer/contract";
import { channel, receive, send } from "@shajara/host/primitives";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

export interface ReplayFrameStream<TEvent extends string> {
  finish: () => RiteCoroutine<void>;
  next: () => RiteCoroutine<ExplorerReplayFrame<TEvent> | null>;
  record: (frame: ExplorerReplayFrame<TEvent>) => RiteCoroutine<void>;
}

export function* createReplayFrameStream<TEvent extends string>(): RiteCoroutine<
  ReplayFrameStream<TEvent>
> {
  const [receiver, sender] = yield* channel<ExplorerReplayFrame<TEvent> | null, null>(Infinity);
  let isFinished = false;

  return {
    *finish() {
      if (isFinished) {
        return;
      }

      isFinished = true;
      yield* send(sender, null);
    },
    next() {
      return receive(receiver);
    },
    *record(frame) {
      if (isFinished) {
        return;
      }

      yield* send(sender, frame);
    },
  };
}

export function* playbackReplayFrames<TEvent extends string>(
  stream: ReplayFrameStream<TEvent>,
  context: PlaybackContext<TEvent>,
): RiteCoroutine<void> {
  let previousRenderTimestampMs: number | null = null;

  while (context.isMounted()) {
    const frame = yield* stream.next();

    if (!frame) {
      return;
    }

    if (previousRenderTimestampMs === null && isSameReplayFrame(frame, context.initialState)) {
      continue;
    }

    yield* waitForRenderSlot(previousRenderTimestampMs, context.minRenderGapMs);

    if (!context.isMounted()) {
      return;
    }

    context.updateState(frame);
    previousRenderTimestampMs = globalThis.performance.now();
  }
}

function isSameReplayFrame<TEvent extends string>(
  frame: ExplorerReplayFrame<TEvent>,
  state: ExplorerReplayState<TEvent>,
): boolean {
  return (
    sameEvents(frame.active, state.active) &&
    sameEvents(frame.completed, state.completed) &&
    sameCursors(frame.cursors, state.cursors)
  );
}

function sameCursors<TEvent extends string>(
  left: readonly ExplorerReplayCursor<TEvent>[],
  right: readonly ExplorerReplayCursor<TEvent>[],
): boolean {
  return (
    left.length === right.length &&
    left.every((cursor, index) => {
      const target = right[index];

      if (!target) {
        return false;
      }

      return (
        cursor.event === target.event &&
        cursor.mode === target.mode &&
        cursor.routineId === target.routineId
      );
    })
  );
}

function sameEvents<TEvent extends string>(
  left: readonly TEvent[],
  right: readonly TEvent[],
): boolean {
  return left.length === right.length && left.every((event, index) => event === right[index]);
}

function* waitForRenderSlot(
  previousRenderTimestampMs: number | null,
  minRenderGapMs: number,
): RiteCoroutine<void> {
  if (previousRenderTimestampMs === null) {
    yield* sleep(minRenderGapMs);
    return;
  }

  const elapsedRenderGapMs = globalThis.performance.now() - previousRenderTimestampMs;
  const remainingRenderGapMs = minRenderGapMs - elapsedRenderGapMs;

  if (remainingRenderGapMs > emptyLength) {
    yield* sleep(remainingRenderGapMs);
  }
}

interface PlaybackContext<TEvent extends string> {
  initialState: ExplorerReplayState<TEvent>;
  isMounted: () => boolean;
  minRenderGapMs: number;
  updateState: (frame: ExplorerReplayFrame<TEvent>) => void;
}

const emptyLength = 0;
