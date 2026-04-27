import type {
  ExplorerEventId,
  ExplorerReplayCursor,
  ExplorerReplayFrame,
  ExplorerReplayState,
  ExplorerReplayTrace,
} from "#/domain/explorer/contract";
import { channel, receive, send } from "@shajara/host/primitives";
import type { RiteCoroutine } from "@shajara/host";
import { sleep } from "@shajara/host";

const emptyEventCount = 0;

export interface ReplayFrameStream<TEvent extends ExplorerEventId> {
  emit: (trace: ExplorerReplayTrace<TEvent>) => RiteCoroutine<void>;
  finish: () => RiteCoroutine<void>;
  next: () => RiteCoroutine<ExplorerReplayFrame<TEvent> | null>;
}

export function* createReplayFrameStream<TEvent extends ExplorerEventId>(
  baselineState: ExplorerReplayState<TEvent>,
): RiteCoroutine<ReplayFrameStream<TEvent>> {
  const [receiver, sender] = yield* channel<ExplorerReplayFrame<TEvent> | null, null>(Infinity);
  let state = baselineState;

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

function applyReplayTrace<TEvent extends ExplorerEventId>(
  state: ExplorerReplayState<TEvent>,
  trace: ExplorerReplayTrace<TEvent>,
): ExplorerReplayFrame<TEvent> {
  const cursorsByRoutine = new Map(state.cursors.map((cursor) => [cursor.routineId, cursor]));

  if (trace.clearCursor) {
    cursorsByRoutine.delete(trace.clearCursor);
  }
  for (const routineId of trace.clearCursors ?? []) {
    cursorsByRoutine.delete(routineId);
  }
  if (trace.cursor) {
    cursorsByRoutine.set(trace.cursor.routineId, trace.cursor);
  }
  for (const cursor of trace.cursors ?? []) {
    cursorsByRoutine.set(cursor.routineId, cursor);
  }

  const cursors = [...cursorsByRoutine.values()];

  return {
    active: cursors.flatMap((cursor) => cursor.events),
    completed: appendCompletedEvent(state.completed, trace),
    cursors,
  };
}

function appendCompletedEvent<TEvent extends ExplorerEventId>(
  completed: readonly TEvent[],
  trace: ExplorerReplayTrace<TEvent>,
): readonly TEvent[] {
  if (!("completed" in trace)) {
    return completed;
  }

  const entries = Array.isArray(trace.completed) ? trace.completed : [trace.completed];
  const nextEntries = entries.filter((event) => !completed.includes(event));

  if (nextEntries.length === emptyEventCount) {
    return completed;
  }

  return [...completed, ...nextEntries];
}

export function* playbackReplayFrames<TEvent extends ExplorerEventId>(
  stream: ReplayFrameStream<TEvent>,
  baselineState: ExplorerReplayState<TEvent>,
  frameSink: ReplayFrameSink<TEvent>,
  minRenderGapMs: number,
): RiteCoroutine<void> {
  let previousRenderTimestampMs: number | null = null;

  while (frameSink.isOpen()) {
    const frame = yield* stream.next();

    if (!frame) {
      return;
    }

    if (previousRenderTimestampMs === null && isSameReplayFrame(frame, baselineState)) {
      continue;
    }

    yield* waitForRenderSlot(previousRenderTimestampMs, minRenderGapMs);

    if (!frameSink.isOpen()) {
      return;
    }

    frameSink.write(frame);
    previousRenderTimestampMs = globalThis.performance.now();
  }
}

function isSameReplayFrame<TEvent extends ExplorerEventId>(
  frame: ExplorerReplayFrame<TEvent>,
  state: ExplorerReplayState<TEvent>,
): boolean {
  return (
    sameEvents(frame.active, state.active) &&
    sameEvents(frame.completed, state.completed) &&
    sameCursors(frame.cursors, state.cursors)
  );
}

function sameCursors<TEvent extends ExplorerEventId>(
  left: readonly ExplorerReplayCursor<TEvent>[],
  right: readonly ExplorerReplayCursor<TEvent>[],
): boolean {
  return (
    left.length === right.length &&
    left.every((cursor, index) => {
      const target = right[index]!;

      return (
        sameEvents(cursor.events, target.events) &&
        cursor.mode === target.mode &&
        cursor.routineId === target.routineId
      );
    })
  );
}

function sameEvents<TEvent extends ExplorerEventId>(
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

interface ReplayFrameSink<TEvent extends ExplorerEventId> {
  isOpen: () => boolean;
  write: (frame: ExplorerReplayFrame<TEvent>) => void;
}

const emptyLength = 0;
