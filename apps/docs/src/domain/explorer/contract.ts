import type { RiteCoroutine } from "@shajara/host";

export type ExplorerEventId = string;
export type ExplorerRoutineId = string;
export type ExplorerTranslationKey = string;
export type ExplorerReplayCursorMode = "blocked" | "running";

export interface ExplorerExample<
  TEvent extends ExplorerEventId,
  TResult,
  TTranslationKey extends ExplorerTranslationKey,
> {
  descriptionKey: TTranslationKey;
  guideKeys: readonly TTranslationKey[];
  id: string;
  stage: ExplorerExampleStage<TEvent, TResult>;
  titleKey: TTranslationKey;
}

export interface ExplorerExampleCodeLine<TEvent extends ExplorerEventId> {
  id: TEvent;
  completedEvents?: readonly TEvent[];
  text: string;
}

export interface ExplorerExampleReplay<TEvent extends ExplorerEventId, TResult> {
  replayDelayMs: number;
  runtime: ExplorerReplayRuntime<TEvent, TResult>;
}

export interface ExplorerExampleStage<TEvent extends ExplorerEventId, TResult> {
  code: readonly ExplorerExampleCodeLine<TEvent>[];
  flow: ExplorerFlowGraph<TEvent>;
  replay: ExplorerExampleReplay<TEvent, TResult>;
}

export interface ExplorerFlowGraph<TEvent extends ExplorerEventId> {
  links: readonly ExplorerFlowGraphLink<TEvent>[];
  nodes: readonly ExplorerFlowGraphNode<TEvent>[];
}

export interface ExplorerFlowGraphLink<TEvent extends ExplorerEventId> {
  activeEvents: readonly TEvent[];
  from: string;
  kind: "dependency" | "spawn";
  label: string;
  visibleLabel?: string;
  to: string;
}

export interface ExplorerFlowGraphNode<TEvent extends ExplorerEventId> {
  activeEvents: readonly TEvent[];
  completedEvents: readonly TEvent[];
  id: string;
  kind: "branch" | "join" | "parent";
  label: string;
  statusRoutineIds: readonly ExplorerRoutineId[];
}

export interface ExplorerReplayFrame<TEvent extends ExplorerEventId> {
  active: readonly TEvent[];
  completed: readonly TEvent[];
  cursors: readonly ExplorerReplayCursor<TEvent>[];
}

export interface ExplorerReplayCursor<TEvent extends ExplorerEventId> {
  events: readonly TEvent[];
  mode: ExplorerReplayCursorMode;
  routineId: ExplorerRoutineId;
}

export interface ExplorerReplayTrace<TEvent extends ExplorerEventId> {
  clearCursor?: ExplorerRoutineId;
  clearCursors?: readonly ExplorerRoutineId[];
  completed?: TEvent | readonly TEvent[];
  cursor?: ExplorerReplayCursor<TEvent>;
  cursors?: readonly ExplorerReplayCursor<TEvent>[];
}

export type ExplorerReplayEmit<TEvent extends ExplorerEventId> = (
  trace: ExplorerReplayTrace<TEvent>,
) => RiteCoroutine<void>;

export type ExplorerReplayRoutine<TEvent extends ExplorerEventId, TResult> = (
  emit: ExplorerReplayEmit<TEvent>,
) => RiteCoroutine<TResult>;

export interface ExplorerReplayRuntime<TEvent extends ExplorerEventId, TResult> {
  createRoutine: () => ExplorerReplayRoutine<TEvent, TResult>;
}

export interface ExplorerReplayState<TEvent extends ExplorerEventId> {
  active: readonly TEvent[];
  completed: readonly TEvent[];
  cursors: readonly ExplorerReplayCursor<TEvent>[];
}

export function createPendingExplorerReplayState<
  TEvent extends ExplorerEventId,
>(): ExplorerReplayState<TEvent> {
  return {
    active: [],
    completed: [],
    cursors: [],
  };
}
