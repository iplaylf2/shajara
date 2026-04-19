import type {
  ExplorerReplayCursor,
  ExplorerReplayFrame,
  ExplorerReplayState,
} from "#/domain/explorer/contract";

export interface ReplayFrameStream<TEvent extends string> {
  finish: () => void;
  next: () => Promise<ExplorerReplayFrame<TEvent> | null>;
  record: (frame: ExplorerReplayFrame<TEvent>) => void;
}

export function createReplayFrameStream<TEvent extends string>(): ReplayFrameStream<TEvent> {
  const queue: ExplorerReplayFrame<TEvent>[] = [];
  let isFinished = false;
  let wake: (() => void) | null = null;

  return {
    finish() {
      isFinished = true;
      wake?.();
      wake = null;
    },
    next() {
      if (queue.length > emptyLength) {
        return Promise.resolve(queue.shift() ?? null);
      }
      if (isFinished) {
        return Promise.resolve(null);
      }

      return new Promise<ExplorerReplayFrame<TEvent> | null>((resolve) => {
        wake = function resolveNextEvent() {
          resolve(queue.shift() ?? null);
        };
      });
    },
    record(frame) {
      queue.push(frame);
      wake?.();
      wake = null;
    },
  };
}

export async function playbackReplayFrames<TEvent extends string>(
  stream: ReplayFrameStream<TEvent>,
  context: PlaybackContext<TEvent>,
): Promise<void> {
  await playbackNextFrame(stream, null, context);
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

async function playbackNextFrame<TEvent extends string>(
  stream: ReplayFrameStream<TEvent>,
  previousRenderTimestampMs: number | null,
  context: PlaybackContext<TEvent>,
): Promise<void> {
  if (!context.isMounted()) {
    return;
  }

  const frame = await stream.next();

  if (!frame) {
    return;
  }

  if (previousRenderTimestampMs === null && isSameReplayFrame(frame, context.initialState)) {
    await playbackNextFrame(stream, previousRenderTimestampMs, context);
    return;
  }

  await waitForRenderSlot(previousRenderTimestampMs, context.minRenderGapMs);

  if (!context.isMounted()) {
    return;
  }

  context.updateState(frame);
  await playbackNextFrame(stream, globalThis.performance.now(), context);
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

function sleepForPlayback(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}

function waitForRenderSlot(
  previousRenderTimestampMs: number | null,
  minRenderGapMs: number,
): Promise<void> {
  if (previousRenderTimestampMs === null) {
    return sleepForPlayback(minRenderGapMs);
  }

  const elapsedRenderGapMs = globalThis.performance.now() - previousRenderTimestampMs;
  const remainingRenderGapMs = minRenderGapMs - elapsedRenderGapMs;

  return remainingRenderGapMs > emptyLength
    ? sleepForPlayback(remainingRenderGapMs)
    : Promise.resolve();
}

interface PlaybackContext<TEvent extends string> {
  initialState: ExplorerReplayState<TEvent>;
  isMounted: () => boolean;
  minRenderGapMs: number;
  updateState: (frame: ExplorerReplayFrame<TEvent>) => void;
}

const emptyLength = 0;
