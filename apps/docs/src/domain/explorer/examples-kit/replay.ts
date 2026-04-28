import type {
  ExplorerEventId,
  ExplorerReplayAction,
  ExplorerReplayCursor,
  ExplorerReplayEmit,
  ExplorerRoutineId,
} from "#/domain/explorer/contract";
import type { RiteCoroutine, RiteRoutine } from "@shajara/host";

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

export function clearCursor(routineId: ExplorerRoutineId): ExplorerReplayAction<never> {
  return clearCursors([routineId]);
}

export function clearCursors(
  routineIds: readonly ExplorerRoutineId[],
): ExplorerReplayAction<never> {
  return { kind: "clear-cursors", routineIds };
}

export function completeEvents<TEvent extends ExplorerEventId>(
  events: TEvent | readonly TEvent[],
): ExplorerReplayAction<TEvent> {
  return { events: typeof events === "string" ? [events] : events, kind: "complete-events" };
}

export function setCursor<TEvent extends ExplorerEventId>(
  cursor: ExplorerReplayCursor<TEvent>,
): ExplorerReplayAction<TEvent> {
  return setCursors([cursor]);
}

export function setCursors<TEvent extends ExplorerEventId>(
  cursors: readonly ExplorerReplayCursor<TEvent>[],
): ExplorerReplayAction<TEvent> {
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
      yield* emit({
        actions: [
          clearCursor(replay.routineId),
          completeEvents([replay.cancelEvent, replay.waitEvent]),
        ],
      });
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
