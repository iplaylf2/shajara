import type {
  ExplorerReplayCursor,
  ExplorerReplayFrame,
  ExplorerReplayState,
  ExplorerReplayTrace,
} from "#/domain/explorer/contract";
import { channel, receive, send } from "@shajara/host/primitives";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

export interface ReplayFrameStream<TEvent extends string> {
  emit: (trace: ExplorerReplayTrace<TEvent>) => RiteCoroutine<void>;
  finish: () => RiteCoroutine<void>;
  next: () => RiteCoroutine<ExplorerReplayFrame<TEvent> | null>;
}

export function* createReplayFrameStream<TEvent extends string>(
  initialState: ExplorerReplayState<TEvent>,
): RiteCoroutine<ReplayFrameStream<TEvent>> {
  const [receiver, sender] = yield* channel<ExplorerReplayFrame<TEvent> | null, null>(Infinity);
  let state = initialState;

  return {
    *emit(trace) {
      state = applyReplayTrace(state, trace);
      yield* send(sender, state);
    },
    *finish() {
      yield* send(sender, null);
    },
    next() {
      return receive(receiver);
    },
  };
}

function applyReplayTrace<TEvent extends string>(
  state: ExplorerReplayState<TEvent>,
  trace: ExplorerReplayTrace<TEvent>,
): ExplorerReplayFrame<TEvent> {
  const cursorsByRoutine = new Map(state.cursors.map((cursor) => [cursor.routineId, cursor]));

  if (trace.clearCursor) {
    cursorsByRoutine.delete(trace.clearCursor);
  }
  if (trace.cursor) {
    cursorsByRoutine.set(trace.cursor.routineId, trace.cursor);
  }

  const cursors = [...cursorsByRoutine.values()];

  return {
    active: cursors.flatMap((cursor) => cursor.events),
    completed: appendCompletedEvent(state.completed, trace),
    cursors,
  };
}

function appendCompletedEvent<TEvent extends string>(
  completed: readonly TEvent[],
  trace: ExplorerReplayTrace<TEvent>,
): readonly TEvent[] {
  if (!("completed" in trace) || completed.includes(trace.completed)) {
    return completed;
  }

  return [...completed, trace.completed];
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
        sameEvents(cursor.events, target.events) &&
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
