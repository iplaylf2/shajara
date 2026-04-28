import type {
  ExplorerEventId,
  ExplorerReplayCursor,
  ExplorerReplayEmit,
  ExplorerReplayTrace,
  ExplorerReplayTraceAction,
  ExplorerRoutineId,
} from "#/domain/explorer/contract";
import type { RiteCoroutine, RiteRoutine } from "@shajara/host";
import type { NonEmptyTuple } from "type-fest";

export function cursorAt<TEvent extends string>(
  routineId: string,
  event: TEvent | readonly TEvent[],
  mode: ExplorerReplayCursor<TEvent>["mode"],
): ExplorerReplayCursor<TEvent> {
  return {
    events: typeof event === "string" ? [event] : event,
    mode,
    routineId,
  };
}

export function replayTrace<TEvent extends ExplorerEventId>(
  ...actions: NonEmptyTuple<ExplorerReplayTraceAction<TEvent>>
): ExplorerReplayTrace<TEvent> {
  return { actions };
}

export function clearReplayCursor(routineId: ExplorerRoutineId): ExplorerReplayTraceAction<never> {
  return clearReplayCursors([routineId]);
}

export function clearReplayCursors(
  routineIds: readonly ExplorerRoutineId[],
): ExplorerReplayTraceAction<never> {
  return { kind: "clear-cursors", routineIds };
}

export function completeReplayEvents<TEvent extends ExplorerEventId>(
  events: TEvent | readonly TEvent[],
): ExplorerReplayTraceAction<TEvent> {
  return { events: typeof events === "string" ? [events] : events, kind: "complete-events" };
}

export function setReplayCursor<TEvent extends ExplorerEventId>(
  cursor: ExplorerReplayCursor<TEvent>,
): ExplorerReplayTraceAction<TEvent> {
  return setReplayCursors([cursor]);
}

export function setReplayCursors<TEvent extends ExplorerEventId>(
  cursors: readonly ExplorerReplayCursor<TEvent>[],
): ExplorerReplayTraceAction<TEvent> {
  return { cursors, kind: "set-cursors" };
}

export function raceBranch<TEvent extends ExplorerEventId, TResult>(
  emit: ExplorerReplayEmit<TEvent>,
  replay: RaceBranchReplay<TEvent>,
  routine: RiteRoutine<TResult>,
): RiteRoutine<TResult> {
  return function* runRaceBranch(): RiteCoroutine<TResult> {
    return yield* playRaceBranch(emit, replay, routine);
  };
}

function* playRaceBranch<TEvent extends ExplorerEventId, TResult>(
  emit: ExplorerReplayEmit<TEvent>,
  replay: RaceBranchReplay<TEvent>,
  routine: RiteRoutine<TResult>,
): RiteCoroutine<TResult> {
  const outcome: BranchOutcome = {
    didReturn: false,
  };

  try {
    const result = yield* routine();

    outcome.didReturn = true;

    return result;
  } finally {
    if (!outcome.didReturn) {
      yield* emit(
        replayTrace(
          clearReplayCursor(replay.routineId),
          completeReplayEvents([replay.cancelEvent, replay.waitEvent]),
        ),
      );
    }
  }
}

interface BranchOutcome {
  didReturn: boolean;
}

export interface RaceBranchReplay<TEvent extends ExplorerEventId> {
  readonly cancelEvent: TEvent;
  readonly routineId: ExplorerRoutineId;
  readonly waitEvent: TEvent;
}
