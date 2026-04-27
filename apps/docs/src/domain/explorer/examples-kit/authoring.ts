import type {
  ExplorerEventId,
  ExplorerExampleCodeLine,
  ExplorerFlowGraphLink,
  ExplorerFlowGraphNode,
  ExplorerReplayCursor,
  ExplorerReplayEmit,
  ExplorerRoutineId,
} from "#/domain/explorer/contract";
import type { RiteCoroutine, RiteRoutine } from "@shajara/host";

export function codeLine<TEvent extends string>(
  id: TEvent,
  text: string,
  completedEvents?: readonly TEvent[],
): ExplorerExampleCodeLine<TEvent> {
  if (!completedEvents) {
    return { id, text };
  }

  return { completedEvents, id, text };
}

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

export function spawnLink<TEvent extends string>(
  from: string,
  to: string,
  label: string,
  activeEvents: readonly TEvent[],
): ExplorerFlowGraphLink<TEvent> {
  return {
    activeEvents,
    from,
    kind: "spawn",
    label,
    to,
  };
}

export function dependencyLink<TEvent extends string>(
  from: string,
  to: string,
  label: string,
  options: ExplorerFlowLinkActivity<TEvent>,
): ExplorerFlowGraphLink<TEvent> {
  const link = {
    activeEvents: options.activeEvents,
    from,
    kind: "dependency",
    label,
    to,
    ...(options.interruptedEvents ? { interruptedEvents: options.interruptedEvents } : {}),
  } as const satisfies ExplorerFlowGraphLink<TEvent>;

  if (options.visibleLabel) {
    return {
      ...link,
      visibleLabel: options.visibleLabel,
    };
  }

  return link;
}

export function parentRoutineNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: ExplorerRoutineNodeLifecycle<TEvent>,
): ExplorerFlowGraphNode<TEvent> {
  return routineNode("parent", id, label, lifecycle);
}

export function branchRoutineNode<TEvent extends string>(
  id: string,
  label: string,
  lifecycle: ExplorerRoutineNodeLifecycle<TEvent>,
): ExplorerFlowGraphNode<TEvent> {
  return routineNode("branch", id, label, lifecycle);
}

function routineNode<TEvent extends string>(
  kind: ExplorerFlowGraphNode<TEvent>["kind"],
  id: string,
  label: string,
  lifecycle: ExplorerRoutineNodeLifecycle<TEvent>,
): ExplorerFlowGraphNode<TEvent> {
  return {
    activeEvents: lifecycle.activeEvents,
    completedEvents: lifecycle.completedEvents,
    id,
    kind,
    label,
    statusRoutineIds: [id],
  };
}

interface ExplorerFlowLinkActivity<TEvent extends string> {
  activeEvents: readonly TEvent[];
  interruptedEvents?: readonly TEvent[];
  visibleLabel?: string;
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

interface ExplorerRoutineNodeLifecycle<TEvent extends string> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
}
