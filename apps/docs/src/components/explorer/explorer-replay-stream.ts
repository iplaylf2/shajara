import type {
  ExplorerReplayCursor,
  ExplorerReplayFrame,
  ExplorerReplayState,
} from "#/domain/explorer/contract";

export interface ReplayEventStream<TEvent extends string> {
  finish: () => void;
  next: () => Promise<RecordedReplayEvent<TEvent> | null>;
  record: (frame: ExplorerReplayFrame<TEvent>) => void;
}

interface RecordedReplayEvent<TEvent extends string> {
  frame: ExplorerReplayFrame<TEvent>;
  timestampMs: number;
}

export function createReplayEventStream<TEvent extends string>(): ReplayEventStream<TEvent> {
  const queue: RecordedReplayEvent<TEvent>[] = [];
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

      return new Promise<RecordedReplayEvent<TEvent> | null>((resolve) => {
        wake = function resolveNextEvent() {
          resolve(queue.shift() ?? null);
        };
      });
    },
    record(frame) {
      queue.push({
        frame,
        timestampMs: globalThis.performance.now(),
      });
      wake?.();
      wake = null;
    },
  };
}

export async function playbackRecordedEvents<TEvent extends string>(
  stream: ReplayEventStream<TEvent>,
  context: PlaybackContext<TEvent>,
): Promise<void> {
  await playbackNextEvent(stream, null, context);
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

async function playbackNextEvent<TEvent extends string>(
  stream: ReplayEventStream<TEvent>,
  previousTimestampMs: number | null,
  context: PlaybackContext<TEvent>,
): Promise<void> {
  if (!context.isMounted()) {
    return;
  }

  const entry = await stream.next();

  if (!entry) {
    return;
  }

  if (previousTimestampMs === null && isSameReplayFrame(entry.frame, context.initialState)) {
    await playbackNextEvent(stream, entry.timestampMs, context);
    return;
  }

  const runtimeGapMs =
    previousTimestampMs === null ? context.minRenderGapMs : entry.timestampMs - previousTimestampMs;
  await sleepForPlayback(Math.max(runtimeGapMs, context.minRenderGapMs));

  if (!context.isMounted()) {
    return;
  }

  context.updateState(entry.frame);
  await playbackNextEvent(stream, entry.timestampMs, context);
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

interface PlaybackContext<TEvent extends string> {
  initialState: ExplorerReplayState<TEvent>;
  isMounted: () => boolean;
  minRenderGapMs: number;
  updateState: (frame: ExplorerReplayFrame<TEvent>) => void;
}

const emptyLength = 0;
