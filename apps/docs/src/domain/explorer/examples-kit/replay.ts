import type {
  ExplorerEventId,
  ExplorerReplayAction,
  ExplorerReplayCursor,
  ExplorerReplayEmit,
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

export function branchWait<TEvent extends ExplorerEventId, TResult>(
  emit: ExplorerReplayEmit<TEvent>,
  replay: BranchWaitReplay<TEvent>,
  routine: RiteRoutine<TResult>,
): RiteRoutine<TResult> {
  emit({
    actions: [setCursor(cursorAt(replay.routineId, replay.events, "blocked"))],
  });

  return routine;
}

export function raceWait<TEvent extends ExplorerEventId, TReturns extends NonEmptyTuple<unknown>>(
  emit: ExplorerReplayEmit<TEvent>,
  replay: RaceWaitReplay<NoInfer<TEvent>>,
  entries: RaceEntryTuple<NoInfer<TEvent>, TReturns>,
): RaceRoutineTuple<TReturns> {
  emit({
    actions: [setCursors([replay.caller, replay.coordinator])],
  });

  return entries.map((entry) => createRaceEntryRoutine(emit, entry)) as RaceRoutineTuple<TReturns>;
}

function createRaceEntryRoutine<TEvent extends ExplorerEventId, TResult>(
  emit: ExplorerReplayEmit<TEvent>,
  entry: RaceEntryReplay<TEvent, TResult>,
): RiteRoutine<TResult> {
  return function* runRaceEntry(): RiteCoroutine<TResult> {
    return yield* playRaceEntry(emit, entry);
  };
}

function* playRaceEntry<TEvent extends ExplorerEventId, TResult>(
  emit: ExplorerReplayEmit<TEvent>,
  entry: RaceEntryReplay<TEvent, TResult>,
): RiteCoroutine<TResult> {
  const outcome: RaceEntryOutcome = {
    didReturn: false,
  };

  try {
    const result = yield* entry.routine();

    outcome.didReturn = true;

    return result;
  } finally {
    if (!outcome.didReturn) {
      emit({
        actions: [
          clearCursor(entry.routineId),
          completeEvents([entry.cancelEvent, entry.waitEvent]),
        ],
      });
    }
  }
}

interface RaceEntryOutcome {
  didReturn: boolean;
}

export interface BranchWaitReplay<TEvent extends ExplorerEventId> {
  readonly events: TEvent | readonly TEvent[];
  readonly routineId: ExplorerRoutineId;
}

export interface RaceWaitReplay<TEvent extends ExplorerEventId> {
  readonly caller: ExplorerReplayCursor<TEvent>;
  readonly coordinator: ExplorerReplayCursor<TEvent>;
}

export interface RaceEntryReplay<TEvent extends ExplorerEventId, TResult> {
  readonly cancelEvent: TEvent;
  readonly routine: RiteRoutine<TResult>;
  readonly routineId: ExplorerRoutineId;
  readonly waitEvent: TEvent;
}

type RaceEntryTuple<TEvent extends ExplorerEventId, TReturns extends NonEmptyTuple> = {
  readonly [Index in keyof TReturns]: RaceEntryReplay<TEvent, TReturns[Index]>;
};

type RaceRoutineTuple<TReturns extends NonEmptyTuple> = {
  readonly [Index in keyof TReturns]: RiteRoutine<TReturns[Index]>;
};
