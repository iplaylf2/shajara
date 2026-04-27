import type {
  ExplorerEventId,
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
        clearCursor: replay.routineId,
        completed: [replay.cancelEvent, replay.waitEvent],
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
