import type {
  ExplorerCursorTargetId,
  ExplorerEventId,
  ExplorerReplayAction,
  ExplorerReplayCursor,
  ExplorerReplayEmit,
} from "#/domain/explorer/contract";
import type { RiteCoroutine, RiteRoutine } from "@shajara/host";
import type { NonEmptyTuple } from "type-fest";

export function cursorAt<TEvent extends string>(
  targetId: string,
  event: TEvent | readonly TEvent[],
  mode: ExplorerReplayCursor<TEvent>["mode"],
): ExplorerReplayCursor<TEvent> {
  return {
    events: typeof event === "string" ? [event] : event,
    mode,
    targetId,
  };
}

export function clearCursor(targetId: ExplorerCursorTargetId): ExplorerReplayAction<never> {
  return { kind: "clear-cursors", targetIds: [targetId] };
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
  entry: RiteRoutine<TResult>,
): RiteRoutine<TResult> {
  emit({
    actions: [setCursor(cursorAt(replay.targetId, replay.events, "blocked"))],
  });

  return entry;
}

export function raceWait<
  TEvent extends ExplorerEventId,
  const TReturns extends NonEmptyTuple<unknown>,
>(
  emit: ExplorerReplayEmit<TEvent>,
  replay: RaceWaitReplay<NoInfer<TEvent>>,
  entries: RaceEntryTuple<NoInfer<TEvent>, TReturns>,
): RaceRoutineTuple<TReturns> {
  emit({
    actions: [setCursors([replay.caller, replay.coordinator])],
  });

  return entries.map((entry) => createRaceEntryProgram(emit, entry)) as RaceRoutineTuple<TReturns>;
}

function createRaceEntryProgram<TEvent extends ExplorerEventId, TResult>(
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
    const result = yield* entry.program();

    outcome.didReturn = true;

    return result;
  } finally {
    if (!outcome.didReturn) {
      emit({
        actions: [
          clearCursor(entry.targetId),
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
  readonly targetId: ExplorerCursorTargetId;
}

export interface RaceWaitReplay<TEvent extends ExplorerEventId> {
  readonly caller: ExplorerReplayCursor<TEvent>;
  readonly coordinator: ExplorerReplayCursor<TEvent>;
}

export interface RaceEntryReplay<TEvent extends ExplorerEventId, TResult> {
  readonly cancelEvent: TEvent;
  readonly program: RiteRoutine<TResult>;
  readonly targetId: ExplorerCursorTargetId;
  readonly waitEvent: TEvent;
}

type RaceEntryTuple<TEvent extends ExplorerEventId, TReturns extends NonEmptyTuple> = {
  readonly [Index in keyof TReturns]: RaceEntryReplay<TEvent, TReturns[Index]>;
};

type RaceRoutineTuple<TReturns extends NonEmptyTuple> = {
  readonly [Index in keyof TReturns]: RiteRoutine<TReturns[Index]>;
};
